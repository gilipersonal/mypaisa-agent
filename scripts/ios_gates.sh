#!/usr/bin/env bash
# The iOS app's gates (MA-165), in one place: the jira-flow `ios` gate, CI's iOS shell job and a person run the same thing.
#   scripts/ios_gates.sh              # every gate; needs a Mac with Xcode
#   scripts/ios_gates.sh --no-xcode   # the gates that run anywhere (CI's Linux job); MA-166 adds the macOS job
# QA on the built app runs only when Arun asks (MA-303, MA-273, MA-362): Maestro across the width bands, locally, by crew:qa-ios.
# iOS accessibility is XCUITest's performAccessibilityAudit() below, never axe. Any iOS build or Swift analysis runs on the laptop, never on GitHub Actions.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"
# The workspace root is web/: ios/ joins it, so every pnpm command starts there.
pnpm() { corepack pnpm@12.16.1 "$@"; }
shell() { pnpm --silent --dir web --filter @mypaisa/ios "$@"; }
step() { printf '\n== %s\n' "$1"; }
fail() { echo "ios_gates: $1" >&2; exit 1; }

step "install: web/pnpm-lock.yaml as committed"
pnpm --dir web install --frozen-lockfile --silent --ignore-scripts

step "tokens: the colour assets match docs/design/ds-v1/tokens.css"
python3 scripts/ios_tokens.py --check

step "selectors: TestIDs.swift mirrors web/src/lib/test-ids.ts"
ids() { grep -oE "mp\.[a-z]+\.[a-zA-Z]+" "$1" | grep -v '^mp\.<' | sort -u; }
web_ids=$(ids web/src/lib/test-ids.ts)
swift_ids=$(ids ios/MyPaisaCore/Testing/TestIDs.swift)
[[ -n "$web_ids" ]] || fail "no selectors read from web/src/lib/test-ids.ts"
[[ "$web_ids" == "$swift_ids" ]] || { diff <(echo "$web_ids") <(echo "$swift_ids") >&2 || true; fail "the selector dictionaries differ"; }

step "dependencies: one Hermes compiler, no CocoaPods"
compilers=$(find web/node_modules/.pnpm -maxdepth 1 -name 'hermes-compiler@*' | wc -l | tr -d ' ')
[[ "$compilers" == "1" ]] || fail "$compilers Hermes compilers: ios/package.json must pin the one react-native names, or the app crashes on a bytecode mismatch"
! grep -qE "^[[:space:]]*(pod|target)[[:space:]]" ios/Podfile || fail "ios/Podfile declares CocoaPods dependencies (MA-229)"

step "types: tsc, strict, the shared TypeScript included"
shell exec tsc --noEmit
step "lint: eslint, no warnings"
shell exec eslint . --max-warnings=0
step "format: prettier"
shell exec prettier --check .
step "tests: Jest"
shell exec jest --silent

# Jest and tsc pass on a toolchain Metro refuses (Babel 8, PR #96, MA-327), so the bundle itself is a gate, on Linux too.
step "bundle: Metro builds the iOS app's JavaScript, as Xcode does"
bundle="$(mktemp -d)/main.jsbundle"
shell exec react-native bundle --platform ios --dev false --entry-file index.js --bundle-output "$bundle" --reset-cache >/dev/null
[[ -s "$bundle" ]] || fail "Metro wrote no bundle"
grep -q 'v1/health' "$bundle" || fail "this check cannot read the bundle"
if grep -q 'auth/local' "$bundle"; then fail "the local sign-in stub reached the bundle"; fi

if [[ "${1:-}" == "--no-xcode" ]]; then
  printf '\nios gates (no Xcode): all passed\n'
  exit 0
fi

command -v xcodebuild >/dev/null || fail "no Xcode here: use --no-xcode, which runs only part of the gate"
derived="${MP_DERIVED_DATA:-$repo/ios/build/DerivedData}"
os="${MP_SIMULATOR_OS:-26.5}"
iphone="platform=iOS Simulator,name=iPhone 17 Pro,OS=$os"
ipad="platform=iOS Simulator,name=iPad Pro 11-inch (M5),OS=$os"
quiet() { "$@" > "$derived.log" 2>&1 || { grep -E 'error:|Failing tests|\*\* ' "$derived.log" | tail -40 >&2; fail "failed; the full log is $derived.log"; }; }
mkdir -p "$(dirname "$derived")"

step "format: swift-format lint, strict"
(cd ios && xcrun swift-format lint --strict --recursive --configuration .swift-format \
  MyPaisa MyPaisaCore MyPaisaTests MyPaisaUITests Packages/MyPaisaUI/Sources Packages/MyPaisaUI/Tests Packages/MyPaisaUI/Package.swift)

step "packages: React Native's Swift packages, from what is committed"
(cd ios && node_modules/.bin/react-native spm update --yes >/dev/null)

step "pieces: MyPaisaUI's snapshot tests, on the iPhone and the iPad"
(cd ios/Packages/MyPaisaUI && quiet xcodebuild test -scheme MyPaisaUI -derivedDataPath "$derived-ui" \
  -destination "$iphone" -destination "$ipad" -disable-concurrent-destination-testing)

step "app: MyPaisa Dev, the unit and UI tests, on the iPhone and the iPad"
(cd ios && quiet xcodebuild test -project MyPaisa.xcodeproj -scheme "MyPaisa Dev" -derivedDataPath "$derived" \
  -destination "$iphone" -destination "$ipad" -disable-concurrent-destination-testing CODE_SIGNING_ALLOWED=NO)

step "prod: MyPaisa builds, on its own id and base URL, with the Debug hooks and probes compiled out"
(cd ios && quiet xcodebuild build -project MyPaisa.xcodeproj -scheme MyPaisa -configuration Release \
  -derivedDataPath "$derived" -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO)
app="$derived/Build/Products/Release-iphonesimulator/MyPaisa.app"
plist() { /usr/libexec/PlistBuddy -c "Print :$1" "$app/Info.plist"; }
[[ "$(plist CFBundleIdentifier)" == "com.mypaisapp.agent" ]] || fail "the prod app's bundle id is wrong"
[[ "$(plist MPApiBaseURL)" == "https://api.mypaisapp.com" ]] || fail "the prod app's base URL is wrong"
[[ "$(plist MYPAISA_BUILD_EPOCH)" -gt 1790000000 ]] || fail "the prod app carries no build epoch"
# `grep -c`, never `! strings | grep -q`: under pipefail, grep stopping early breaks the pipe, the pipeline fails, and `!`
# turns that into a pass, so the check could never fail.
found() { strings "$2" | grep -c "$1" || true; }
for hook in MYPAISA_API_URL MYPAISA_AUTH_STUB MYPAISA_STATIC_MOTION MYPAISA_VIEWPORT_WIDTH mpProbe; do
  [[ "$(found "$hook" "$app/MyPaisa")" == 0 ]] || fail "$hook reached the Release binary"
done
[[ -s "$app/main.jsbundle" ]] || fail "the Release app has no JavaScript bundle"
[[ "$(found 'v1/health' "$app/main.jsbundle")" != 0 ]] || fail "this check cannot read the Release bundle"
[[ "$(found 'auth/local' "$app/main.jsbundle")" == 0 ]] || fail "the local sign-in stub reached the Release bundle"

printf '\nios gates: all passed\n'
