#!/usr/bin/env bash
# The selftest of scripts/security_scan.sh's ios mode (MA-363): each refusal proved on a planted fixture, offline.
#
#   scripts/security_scan_selftest.sh     # or: scripts/security_scan.sh selftest
#
# Every case copies one clean fixture tree, plants one fault, runs the real `security_scan.sh ios` on it with the real
# allow-list (scripts/security/ios-allow.json), and expects its exit code, its message and, for a refusal, exactly one
# refusal: so the planted fault is what was refused, and the harness makes no failure of its own (lessons 12, 16 and 49
# of .claude/rules/independent-review.md). The clean tree must pass first. No case may reach the network or fetch a
# scanner: curl and uvx are stand-ins that leave a mark, the tool cache is empty, and a mark fails the selftest.
# It needs macOS, as the ios mode does: plutil reads the plists (MA-166). Linux is played with SECURITY_SCAN_UNAME.
#
# Not proved here, because each fetches a scanner (run them on Arun's yes, with the security scan):
#   - semgrep's Swift rules: `scripts/security_scan.sh swift-proof` plants a Swift file and names the rule for each fault.
#   - gitleaks over the Release bundle: see the manual step printed at the end.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
scan="$repo/scripts/security_scan.sh"

[[ "$(uname -s)" == Darwin ]] || {
  echo "security_scan_selftest: needs macOS: the ios mode it proves reads plists with plutil (MA-166)" >&2
  exit 2
}

tmp="${TMPDIR:-/tmp}"
work="$(mktemp -d "${tmp%/}/security-selftest.XXXXXX")"
trap 'chmod -R u+rwX "$work" 2>/dev/null || true; rm -rf "$work"' EXIT
mkdir -p "$work/bin" "$work/cache"
for tool in curl uvx; do
  printf '#!/bin/sh\ntouch "%s/network-used"\nexit 97\n' "$work" > "$work/bin/$tool"
  chmod +x "$work/bin/$tool"
done
export PATH="$work/bin:$PATH" XDG_CACHE_HOME="$work/cache"
unset MP_DERIVED_DATA SECURITY_SCAN_UNAME SECURITY_SCAN_IOS_ROOT SECURITY_SCAN_IOS_ALLOW

# plist FILE BODY: an XML property list holding BODY in its top dictionary.
plist() {
  mkdir -p "$(dirname "$1")"
  printf '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n%s\n</dict>\n</plist>\n' "$2" > "$1"
}

ATS_DEBUG='<key>NSAppTransportSecurity</key><dict><key>NSAllowsArbitraryLoads</key><false/><key>NSAllowsLocalNetworking</key><true/></dict>'
ATS_RELEASE='<key>NSAppTransportSecurity</key><dict><key>NSAllowsArbitraryLoads</key><false/></dict>'
APP_KEYS='<key>CFBundleExecutable</key><string>MyPaisa</string><key>CFBundleIdentifier</key><string>com.example.planted</string>'
ENTITLEMENTS='<key>aps-environment</key><string>production</string><key>com.apple.developer.associated-domains</key><array><string>applinks:dashboard.mypaisapp.com</string><string>webcredentials:dashboard.mypaisapp.com</string></array>'

# The clean tree: an app Info.plist that keeps NSAllowsLocalNetworking for Debug (the allow-list's ats.debug_only), an
# entitlements file of allowed keys and values, and an Xcode project naming both, as ios/MyPaisa.xcodeproj does.
clean="$work/clean/ios"
plist "$clean/MyPaisa/Info.plist" "$APP_KEYS$ATS_DEBUG"
plist "$clean/MyPaisa/MyPaisa.entitlements" "$ENTITLEMENTS"
mkdir -p "$clean/MyPaisa.xcodeproj"
cat > "$clean/MyPaisa.xcodeproj/project.pbxproj" <<'PBX'
// !$*UTF8*$!
{
	objects = {
		A1 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				CODE_SIGN_ENTITLEMENTS = MyPaisa/MyPaisa.entitlements;
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = MyPaisa/Info.plist;
			};
		};
	};
}
PBX

# tree NAME: a fresh copy of the clean tree for one case; prints its ios root.
tree() { cp -R "$work/clean" "$work/$1"; echo "$work/$1/ios"; }

# app ROOT: a clean built Release app beside the tree, as xcodebuild leaves it (a binary Info.plist); prints the
# DerivedData folder to hand the scan as MP_DERIVED_DATA.
app() {
  local derived="$1/../dd" bundle
  bundle="$derived/Build/Products/Release-iphonesimulator/MyPaisa.app"
  plist "$bundle/Info.plist" "$APP_KEYS$ATS_RELEASE"
  plutil -convert binary1 "$bundle/Info.plist"
  printf 'planted Mach-O stand-in\0MPBENCH launch first_piece_ms\0https://api.mypaisapp.com\0' > "$bundle/MyPaisa"
  printf 'var health = "v1/health";\n' > "$bundle/main.jsbundle"
  (cd "$derived" && pwd)
}

passed=0
failed=0
# expect NAME CODE TEXT VAR=VALUE...: run `security_scan.sh ios` with the VARs; want exit CODE and TEXT in its output,
# and, for a refusal (1), exactly one refusal.
expect() {
  local name=$1 want=$2 text=$3 code=0 out hits refusals
  shift 3
  out=$(env "$@" "$scan" ios 2>&1) || code=$?
  hits=$(grep -c -F -- "$text" <<<"$out" || true)
  refusals=$(grep -c -F -- 'ios: refused:' <<<"$out" || true)
  if [[ "$code" == "$want" && "$hits" -ge 1 ]] && { [[ "$want" != 1 ]] || [[ "$refusals" == 1 ]]; }; then
    passed=$((passed + 1))
    printf 'ok    %-26s exit %s: %s\n' "$name" "$code" "$text"
  else
    failed=$((failed + 1))
    printf 'FAIL  %-26s wanted exit %s, "%s" and one refusal; got exit %s, %s match(es), %s refusal(s):\n' \
      "$name" "$want" "$text" "$code" "$hits" "$refusals"
    tail -15 <<<"$out" | sed 's/^/      /'
  fi
}

# Linux: the mode stops before anything else.
expect linux 2 "ios mode needs macOS (MA-166: iOS checks run on the laptop)" \
  SECURITY_SCAN_UNAME=Linux SECURITY_SCAN_IOS_ROOT="$clean"

# The clean tree passes, so each fault below is the only thing a case changes.
expect clean 0 "ios: passed: 1 Info.plist file(s), 1 entitlements file(s)" SECURITY_SCAN_IOS_ROOT="$clean"
expect clean-not-built 0 "so its bundle was not checked" SECURITY_SCAN_IOS_ROOT="$clean"

# Info.plist: App Transport Security.
r=$(tree arbitrary-loads)
plutil -replace NSAppTransportSecurity.NSAllowsArbitraryLoads -bool YES "$r/MyPaisa/Info.plist"
expect arbitrary-loads 1 "NSAllowsArbitraryLoads must be absent or false" SECURITY_SCAN_IOS_ROOT="$r"

r=$(tree arbitrary-loads-string)
plutil -replace NSAppTransportSecurity.NSAllowsArbitraryLoads -string YES "$r/MyPaisa/Info.plist"
expect arbitrary-loads-string 1 "NSAllowsArbitraryLoads must be absent or false" SECURITY_SCAN_IOS_ROOT="$r"

r=$(tree web-content)
plutil -insert NSAppTransportSecurity.NSAllowsArbitraryLoadsInWebContent -bool YES "$r/MyPaisa/Info.plist"
expect web-content 1 "NSAllowsArbitraryLoadsInWebContent must be absent or false" SECURITY_SCAN_IOS_ROOT="$r"

r=$(tree exception-domain)
plutil -insert NSAppTransportSecurity.NSExceptionDomains \
  -json '{"evil.example.com":{"NSExceptionAllowsInsecureHTTPLoads":true}}' "$r/MyPaisa/Info.plist"
expect exception-domain 1 "the exception domain evil.example.com is not in" SECURITY_SCAN_IOS_ROOT="$r"

r=$(tree unknown-ats-key)
plutil -insert NSAppTransportSecurity.NSAllowsEverything -bool YES "$r/MyPaisa/Info.plist"
expect unknown-ats-key 1 "holds NSAllowsEverything, a key this check does not read" SECURITY_SCAN_IOS_ROOT="$r"

r=$(tree background-mode)
plutil -insert UIBackgroundModes -json '["audio"]' "$r/MyPaisa/Info.plist"
expect background-mode 1 "the background mode audio is not in" SECURITY_SCAN_IOS_ROOT="$r"

# Info.plist: a file the check cannot read, or cannot find.
r=$(tree corrupt-plist)
printf 'not a property list <dict>\n' > "$r/MyPaisa/Info.plist"
expect corrupt-plist 1 "cannot read or parse $r/MyPaisa/Info.plist" SECURITY_SCAN_IOS_ROOT="$r"

r=$(tree unreadable-plist)
chmod 000 "$r/MyPaisa/Info.plist"
expect unreadable-plist 1 "cannot read or parse $r/MyPaisa/Info.plist" SECURITY_SCAN_IOS_ROOT="$r"

r=$(tree no-plist)
rm "$r/MyPaisa/Info.plist" "$r/MyPaisa.xcodeproj/project.pbxproj"
expect no-plist 1 "no Info.plist under $r" SECURITY_SCAN_IOS_ROOT="$r"

r=$(tree plist-reference-missing)
sed -i '' 's|INFOPLIST_FILE = MyPaisa/Info.plist;|INFOPLIST_FILE = MyPaisa/App.plist;|' "$r/MyPaisa.xcodeproj/project.pbxproj"
expect plist-reference-missing 1 "INFOPLIST_FILE = MyPaisa/App.plist, which does not exist" SECURITY_SCAN_IOS_ROOT="$r"

r=$(tree plist-reference-unresolved)
# shellcheck disable=SC2016 # the literal $(TARGET_NAME) is the planted fault
sed -i '' 's|INFOPLIST_FILE = MyPaisa/Info.plist;|INFOPLIST_FILE = "$(TARGET_NAME)/Info.plist";|' "$r/MyPaisa.xcodeproj/project.pbxproj"
expect plist-reference-unresolved 1 "which this check cannot resolve to a file" SECURITY_SCAN_IOS_ROOT="$r"

# Entitlements.
r=$(tree unknown-entitlement)
plist "$r/MyPaisa/MyPaisa.entitlements" "$ENTITLEMENTS<key>get-task-allow</key><true/>"
expect unknown-entitlement 1 "the entitlement get-task-allow is not in" SECURITY_SCAN_IOS_ROOT="$r"

r=$(tree entitlement-value)
plist "$r/MyPaisa/MyPaisa.entitlements" '<key>com.apple.developer.associated-domains</key><array><string>applinks:dashboard.mypaisapp.com</string><string>applinks:evil.example.com</string></array>'
expect entitlement-value 1 'holds "applinks:evil.example.com", which the allow-list does not allow' SECURITY_SCAN_IOS_ROOT="$r"

r=$(tree entitlement-type)
plist "$r/MyPaisa/MyPaisa.entitlements" '<key>aps-environment</key><array><string>production</string></array>'
expect entitlement-type 1 "the entitlement aps-environment is not a string" SECURITY_SCAN_IOS_ROOT="$r"

r=$(tree entitlements-reference-missing)
sed -i '' 's|MyPaisa/MyPaisa.entitlements;|MyPaisa/Gone.entitlements;|' "$r/MyPaisa.xcodeproj/project.pbxproj"
expect entitlements-reference-missing 1 "CODE_SIGN_ENTITLEMENTS = MyPaisa/Gone.entitlements, which does not exist" \
  SECURITY_SCAN_IOS_ROOT="$r"

# The built Release app. Each refusal comes before gitleaks would be fetched, so no case reaches the network.
r=$(tree bundle-deny-jsbundle)
d=$(app "$r")
printf 'var api = "http://localhost:8787";\n' >> "$d/Build/Products/Release-iphonesimulator/MyPaisa.app/main.jsbundle"
expect bundle-deny-jsbundle 1 "localhost:8787 reached the Release jsbundle" SECURITY_SCAN_IOS_ROOT="$r" MP_DERIVED_DATA="$d"

r=$(tree bundle-deny-binary-utf16)
d=$(app "$r")
python3 -I -c 'import sys; open(sys.argv[1], "ab").write(sys.argv[2].encode("utf-16-le"))' \
  "$d/Build/Products/Release-iphonesimulator/MyPaisa.app/MyPaisa" "api-dev.mypaisapp.com"
expect bundle-deny-binary-utf16 1 "api-dev.mypaisapp.com reached the Release binary" \
  SECURITY_SCAN_IOS_ROOT="$r" MP_DERIVED_DATA="$d"

r=$(tree bundle-unread)
d=$(app "$r")
printf 'var nothing = 1;\n' > "$d/Build/Products/Release-iphonesimulator/MyPaisa.app/main.jsbundle"
expect bundle-unread 1 "its known string v1/health is not in it" SECURITY_SCAN_IOS_ROOT="$r" MP_DERIVED_DATA="$d"

r=$(tree release-local-networking)
d=$(app "$r")
plutil -insert NSAppTransportSecurity.NSAllowsLocalNetworking -bool YES \
  "$d/Build/Products/Release-iphonesimulator/MyPaisa.app/Info.plist"
expect release-local-networking 1 "NSAllowsLocalNetworking must be absent or false in the Release app" \
  SECURITY_SCAN_IOS_ROOT="$r" MP_DERIVED_DATA="$d"

r=$(tree release-no-executable)
d=$(app "$r")
plutil -remove CFBundleExecutable "$d/Build/Products/Release-iphonesimulator/MyPaisa.app/Info.plist"
expect release-no-executable 1 "names no executable (CFBundleExecutable)" SECURITY_SCAN_IOS_ROOT="$r" MP_DERIVED_DATA="$d"

expect derived-data-empty 2 "MP_DERIVED_DATA is set but holds no Release app" \
  SECURITY_SCAN_IOS_ROOT="$clean" MP_DERIVED_DATA="$work/no-such-derived-data"

# The allow-list: unreadable, or excusing what may never be excused.
expect allow-list-missing 2 "cannot read the allow-list" \
  SECURITY_SCAN_IOS_ROOT="$clean" SECURITY_SCAN_IOS_ALLOW="$work/no-such-allow.json"
python3 -I -c 'import json, sys
allow = json.load(open(sys.argv[1]))
allow["ats"]["debug_only"]["NSAllowsArbitraryLoads"] = "planted: never allowed"
json.dump(allow, open(sys.argv[2], "w"))' "$repo/scripts/security/ios-allow.json" "$work/allow-arbitrary.json"
expect allow-list-arbitrary 2 "is malformed: ats.debug_only" \
  SECURITY_SCAN_IOS_ROOT="$clean" SECURITY_SCAN_IOS_ALLOW="$work/allow-arbitrary.json"

if [[ -e "$work/network-used" ]]; then
  failed=$((failed + 1))
  echo "FAIL  a case reached for the network or a scanner (curl or uvx ran)"
fi

printf '\nsecurity_scan selftest: %d passed, %d failed\n' "$passed" "$failed"
cat <<'MANUAL'

MANUAL, on Arun's yes (each fetches a scanner, so this selftest cannot prove it offline):
  1. scripts/security_scan.sh swift-proof
     semgrep's Swift rules on a planted Swift file. Expected: caught by
       swift.lang.storage.sensitive-storage-userdefaults.swift-user-defaults  (p/swift): UserDefaults.set(password, ...)
       mobsf.mobsfscan.swift.secrets.ios_hardcoded_secret                     (p/mobsfscan): let password = "..."
       mobsf.mobsfscan.swift.auth.ios_keychain_weak_accessibility_value       (p/mobsfscan): kSecAttrAccessibleAlways
       mobsf.mobsfscan.swift.logging.ios_log                                  (p/mobsfscan): NSLog of a token
       mobsf.mobsfscan.swift.crypto.ios_weak_hash                             (p/mobsfscan): CC_MD5(
     and left out: mobsf.mobsfscan.best_practices.swift.keyboard.ios_keyboard_cache (a protection, --exclude-rule).
  2. gitleaks over a Release bundle: copy a built MyPaisa.app into <tmp>/dd/Build/Products/Release-iphonesimulator/,
     add a file holding a planted key (e.g. AKIA followed by 16 capitals and digits) to the copy, then
     MP_DERIVED_DATA=<tmp>/dd scripts/security_scan.sh ios  must fail at gitleaks; without the planted file it passes.
MANUAL
[[ "$failed" == 0 ]]
