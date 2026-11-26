#!/usr/bin/env bash
# The repo's security scans (MA-326), one script for a laptop, CI's Security job and the weekly sweep.
#
#   scripts/security_scan.sh              # every scan; on a Mac `ios` too, never on Linux (below)
#   scripts/security_scan.sh secrets      # one of: secrets sast deps workflows ios
#   scripts/security_scan.sh staged       # gitleaks on what is staged (the pre-commit hook)
#   scripts/security_scan.sh selftest     # the ios mode's refusals, proved offline on planted fixtures (MA-363)
#   scripts/security_scan.sh swift-proof  # semgrep's Swift rules on a planted Swift file; fetches semgrep (MA-363)
#
# The repo is public: GitHub's CodeQL default setup and secret scanning with push protection run beside this script, as
# repository settings, not here (MA-346); these tools cover what they do not. CodeQL analyses no Swift (MA-166: no iOS
# build or Swift analysis on GitHub Actions), so on the laptop `sast` runs semgrep's registry rules for Swift in its
# place: p/swift and p/mobsfscan's Swift rules, with p/secrets, over the app's own Swift (MA-363). On Linux (CI's
# Security job, the weekly sweep) `sast` leaves the Swift out and says so. `swift-proof` shows the rules bite.
#
# `ios` runs on the laptop only (MA-166, MA-363): it reads plists with macOS's plutil, so on Linux it exits 2 and `all`
# leaves it out. It refuses, in every Info.plist under ios/: App Transport Security loosened (NSAllowsArbitraryLoads at
# all; the other loosening keys unless scripts/security/ios-allow.json lets the source carry them for Debug), and an
# exception domain or background mode the allow-list does not name; in every entitlements file, a key or value it does
# not name. In the built Release app (ios/build/DerivedData, or MP_DERIVED_DATA, where scripts/ios_gates.sh builds it)
# it refuses the same in its Info.plist with no Debug allowance, and a deny-listed string in the binary or
# main.jsbundle, then runs gitleaks over the bundle and the binary's strings. With no built Release app it says so and
# checks the Info.plist and entitlements files only. ios_gates.sh's own Release checks are not repeated here.
#
# Every tool is pinned. gitleaks and osv-scanner are release binaries checked against
# their published SHA-256 before they run; semgrep and zizmor come from PyPI at a fixed version through uvx. A tool that
# cannot be fetched or does not match its checksum fails the scan: nothing is skipped (fails closed).
# The backend's own Bandit rules (ruff S) and pip-audit --strict run in scripts/backend_gates.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

which="${1:-all}"
# The selftest runs no scanner and needs no pinned tool.
if [[ "$which" == selftest ]]; then exec scripts/security_scan_selftest.sh; fi

GITLEAKS_VERSION=8.30.1
OSV_VERSION=2.7.0
SEMGREP_VERSION=1.183.0
ZIZMOR_VERSION=1.32.0
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/mypaisa-security"

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)
    GITLEAKS_ASSET="gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
    GITLEAKS_SHA=551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb
    OSV_ASSET=osv-scanner_linux_amd64
    OSV_SHA=160c6253e2922e9e0a6a9771c5c4c40a4b3c6090b34a3cdd5e80c96cc2e4218b ;;
  Darwin-arm64)
    GITLEAKS_ASSET="gitleaks_${GITLEAKS_VERSION}_darwin_arm64.tar.gz"
    GITLEAKS_SHA=b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5
    OSV_ASSET=osv-scanner_darwin_arm64
    OSV_SHA=d4926ef8da134332543be276dff157e4c170f99ad91fc48e89448a8816bdf70b ;;
  *) echo "security_scan: no pinned tools for $(uname -s)-$(uname -m)" >&2; exit 2 ;;
esac

sha256() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }

# fetch URL FILE SHA: download once into the cache, and refuse a file whose hash is not the pinned one.
fetch() {
  local url=$1 file=$2 want=$3
  mkdir -p "$CACHE"
  if [[ ! -f "$CACHE/$file" ]] || [[ "$(sha256 "$CACHE/$file")" != "$want" ]]; then
    curl --fail --silent --show-error --location --retry 2 --max-time 120 "$url" --output "$CACHE/$file.part"
    [[ "$(sha256 "$CACHE/$file.part")" == "$want" ]] || { echo "security_scan: $file does not match its pinned SHA-256" >&2; exit 2; }
    mv "$CACHE/$file.part" "$CACHE/$file"
  fi
  echo "$CACHE/$file"
}

step() { printf '\n== %s\n' "$1"; }

# The OS `ios`, `sast`'s Swift and `all` see: `uname -s`, unless SECURITY_SCAN_UNAME stands in for it, as the selftest
# does to play Linux on the laptop. The pinned tools above always follow the real machine.
host_os="${SECURITY_SCAN_UNAME:-$(uname -s)}"
# What a run left out, named in its last line.
not_run=""

# semgrep's rules for Swift (MA-363), for `sast` and `swift-proof` alike. p/mobsfscan's best_practices rules match a
# protection that is present (pinning, jailbreak detection, autocorrection off), which semgrep would count as a finding,
# so they are left out; its Java and Kotlin rules find no file here.
SWIFT_RULES=(--config p/swift --config p/mobsfscan)
for rule in jailbreak.ios_jailbreak_detect keyboard.ios_custom_keyboard_disabled keyboard.ios_keyboard_cache \
  resilience.ios_detect_reversing resilience.ios_cert_pinning; do
  SWIFT_RULES+=(--exclude-rule "mobsf.mobsfscan.best_practices.swift.$rule")
done

scan_secrets() {
  step "secrets: gitleaks ${GITLEAKS_VERSION}, every commit in the history (pre-commit checks what is staged)"
  local archive dir="$CACHE/gitleaks-${GITLEAKS_VERSION}"
  archive=$(fetch "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${GITLEAKS_ASSET}" "$GITLEAKS_ASSET" "$GITLEAKS_SHA")
  mkdir -p "$dir" && tar -xzf "$archive" -C "$dir" gitleaks
  "$dir/gitleaks" git --no-banner --redact --exit-code 1 .
}

scan_staged() {
  local archive dir="$CACHE/gitleaks-${GITLEAKS_VERSION}"
  archive=$(fetch "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${GITLEAKS_ASSET}" "$GITLEAKS_ASSET" "$GITLEAKS_SHA")
  mkdir -p "$dir" && tar -xzf "$archive" -C "$dir" gitleaks
  "$dir/gitleaks" git --pre-commit --staged --no-banner --redact --exit-code 1 .
  exit 0
}

scan_sast() {
  local what="python, fastapi, typescript, javascript, secrets, github-actions" over="backend/, web/, scripts/ and .github/"
  local args=(scan --metrics=off --error --quiet
    --config p/python --config p/fastapi --config p/typescript --config p/javascript
    --config p/secrets --config p/github-actions
    --exclude web/node_modules --exclude web/build --exclude web/.svelte-kit)
  # The app's Swift on the laptop only: no Swift analysis runs on GitHub Actions (MA-166, .claude/rules/testing.md).
  if [[ "$host_os" == Darwin ]]; then
    what="$what, swift, mobsfscan's Swift"
    over="backend/, web/, scripts/, .github/ and the iOS app's Swift"
    args+=("${SWIFT_RULES[@]}" --exclude ios/build --exclude ios/node_modules --exclude .build --exclude DerivedData
      --exclude Pods)
  fi
  args+=(backend web scripts .github)
  if [[ "$host_os" == Darwin ]]; then args+=(ios/MyPaisa ios/MyPaisaCore ios/Packages); fi
  step "sast: semgrep ${SEMGREP_VERSION} ($what) over $over"
  uvx "semgrep==${SEMGREP_VERSION}" "${args[@]}"
  echo "semgrep: no findings (semgrep does not parse .svelte; eslint's no-eval rules cover those files in the web gate)"
  if [[ "$host_os" != Darwin ]]; then
    echo "semgrep: the iOS app's Swift is analysed on the laptop only (MA-166), not on $host_os"
    not_run="${not_run:+$not_run; }Swift SAST (laptop only)"
  fi
}

scan_deps() {
  step "dependencies: osv-scanner ${OSV_VERSION} over every lockfile"
  local osv
  osv=$(fetch "https://github.com/google/osv-scanner/releases/download/v${OSV_VERSION}/${OSV_ASSET}" "${OSV_ASSET}-${OSV_VERSION}" "$OSV_SHA")
  chmod +x "$osv"
  local args=()
  while IFS= read -r f; do args+=(--lockfile "$f"); done < <(git ls-files '*uv.lock' '*package-lock.json' '*pnpm-lock.yaml' '*Package.resolved')
  [[ ${#args[@]} -gt 0 ]] || { echo "security_scan: no lockfile found" >&2; exit 2; }
  "$osv" scan source "${args[@]}"
}

scan_workflows() {
  step "workflows: zizmor ${ZIZMOR_VERSION} over .github/workflows/"
  uvx "zizmor==${ZIZMOR_VERSION}" --min-severity low .github/workflows/
}

# The ios mode's checks on the plists, the entitlements and the Release bundle (MA-363), run as
# `python3 -I -c "$IOS_CHECK" <ios root> <allow-list> <Release app, or "">`. Every file it cannot find, read or parse is
# a refusal (exit 1); an allow-list it cannot read, or one that would excuse what it must not, stops it (exit 2).
IFS= read -r -d '' IOS_CHECK <<'PY' || true
import datetime, json, os, re, subprocess, sys

root, allow_path, app = sys.argv[1], sys.argv[2], sys.argv[3]
LOOSENERS = ("NSAllowsArbitraryLoadsInWebContent", "NSAllowsArbitraryLoadsForMedia", "NSAllowsLocalNetworking")
ATS_KEYS = {"NSAllowsArbitraryLoads", "NSExceptionDomains", "NSPinnedDomains"} | set(LOOSENERS)
PRUNE = {".build", ".git", "build", "DerivedData", "node_modules", "Pods"}
TYPES = {"string": str, "array": str, "boolean": bool}
PBX_REF = re.compile(r'"?\b(INFOPLIST_FILE|CODE_SIGN_ENTITLEMENTS)(?:\[[^\]\n]*\])?"?\s*=\s*("?)([^";\n]*)\2\s*;')
XC_REF = re.compile(r'^[ \t]*(INFOPLIST_FILE|CODE_SIGN_ENTITLEMENTS)(?:\[[^\]\n]*\])?[ \t]*=[ \t]*(.*?)[ \t]*(?://.*)?$', re.M)
problems = []


def refuse(message):
    problems.append(message)


def cannot_run(message):
    print("security_scan: ios: " + message, file=sys.stderr)
    sys.exit(2)


def reasoned(value):
    return isinstance(value, str) and value.strip() != ""


def canonical(value):
    return json.dumps(value, sort_keys=True)


def load_allow(path):
    try:
        with open(path, encoding="utf-8") as handle:
            allow = json.load(handle)
    except (OSError, ValueError) as error:
        cannot_run("cannot read the allow-list %s (%s)" % (path, error))

    def need(ok, what):
        if not ok:
            cannot_run("the allow-list %s is malformed: %s" % (path, what))

    need(isinstance(allow, dict), "it is not an object")
    ats = allow.get("ats")
    need(isinstance(ats, dict), "ats is not an object")
    debug = ats.get("debug_only")
    need(isinstance(debug, dict) and all(k in LOOSENERS and reasoned(v) for k, v in debug.items()),
         "ats.debug_only maps one of %s to its reason, and nothing else" % ", ".join(LOOSENERS))
    domains = ats.get("exception_domains")
    need(isinstance(domains, dict) and all(isinstance(v, dict) and reasoned(v.get("reason"))
                                           and isinstance(v.get("settings"), dict) for v in domains.values()),
         "ats.exception_domains maps a domain to its reason and its exact settings")
    modes = allow.get("background_modes")
    need(isinstance(modes, dict) and all(reasoned(v) for v in modes.values()),
         "background_modes maps a mode to its reason")
    entitlements = allow.get("entitlements")
    need(isinstance(entitlements, dict), "entitlements is not an object")
    for key, entry in entitlements.items():
        need(isinstance(entry, dict) and entry.get("type") in TYPES and reasoned(entry.get("reason"))
             and isinstance(entry.get("values"), list) and entry["values"]
             and all(type(v) is TYPES[entry["type"]] for v in entry["values"]),
             "entitlements.%s needs a type (string, array or boolean), its values and a reason" % key)
    bundle = allow.get("release_bundle")
    need(isinstance(bundle, dict), "release_bundle is not an object")
    canaries = bundle.get("canaries")
    need(isinstance(canaries, dict) and set(canaries) == {"binary", "jsbundle"}
         and all(isinstance(v, str) and v for v in canaries.values()),
         "release_bundle.canaries names one known string for the binary and one for the jsbundle")
    deny = bundle.get("deny")
    need(isinstance(deny, list) and deny and all(
        isinstance(d, dict) and isinstance(d.get("string"), str) and d["string"] and reasoned(d.get("reason"))
        and isinstance(d.get("in"), list) and d["in"] and set(d["in"]) <= {"binary", "jsbundle"} for d in deny),
         "release_bundle.deny lists each string with where it is refused (binary, jsbundle) and why")
    return allow


class Unreadable(Exception):
    pass


def read_plist(path):
    try:
        run = subprocess.run(["plutil", "-convert", "json", "-o", "-", path],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise Unreadable("cannot read or parse %s (%s)" % (path, error))
    if run.returncode != 0:
        said = (run.stderr or run.stdout).decode("utf-8", "replace").strip().splitlines()
        raise Unreadable("cannot read or parse %s (plutil: %s)" % (path, said[-1] if said else "exit %d" % run.returncode))
    try:
        data = json.loads(run.stdout.decode("utf-8"))
    except ValueError as error:
        raise Unreadable("cannot read or parse %s (%s)" % (path, error))
    if not isinstance(data, dict):
        raise Unreadable("cannot read %s: it is not a dictionary" % path)
    return data


def read_text(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as handle:
            return handle.read()
    except OSError as error:
        refuse("cannot read %s (%s)" % (path, error.strerror))
        return None


def walk(top):
    found = {"plist": [], "entitlements": [], "pbxproj": [], "xcconfig": []}

    def unreadable(error):
        refuse("cannot read %s (%s)" % (error.filename, error.strerror))

    for folder, dirs, files in os.walk(top, onerror=unreadable):
        dirs[:] = sorted(d for d in dirs if d not in PRUNE)
        for name in sorted(files):
            path = os.path.join(folder, name)
            if name == "Info.plist" or name.endswith("-Info.plist"):
                found["plist"].append(path)
            elif name.endswith(".entitlements"):
                found["entitlements"].append(path)
            elif name == "project.pbxproj" and folder.endswith(".xcodeproj"):
                found["pbxproj"].append(path)
            elif name.endswith(".xcconfig"):
                found["xcconfig"].append(path)
    return found


def referenced(found, top):
    """The Info.plist and entitlements files the Xcode projects and xcconfigs name: each must exist and is checked."""
    refs = {"INFOPLIST_FILE": [], "CODE_SIGN_ENTITLEMENTS": []}

    def add(key, value, base, origin):
        value = value.strip().strip('"')
        if not value:
            return
        resolved = value
        for var in ("$(SRCROOT)", "${SRCROOT}", "$(PROJECT_DIR)", "${PROJECT_DIR}"):
            resolved = resolved.replace(var, base)
        if "$" in resolved:
            refuse("%s sets %s = %s, which this check cannot resolve to a file" % (origin, key, value))
            return
        path = os.path.normpath(os.path.join(base, resolved))
        if not os.path.isfile(path):
            refuse("%s sets %s = %s, which does not exist" % (origin, key, value))
            return
        refs[key].append(path)

    for path in found["pbxproj"]:
        text = read_text(path)
        for match in PBX_REF.finditer(text or ""):
            add(match.group(1), match.group(3), os.path.dirname(os.path.dirname(path)), path)
    # An xcconfig's paths are read from the project folder that uses it, which here is the ios root.
    for path in found["xcconfig"]:
        text = read_text(path)
        for match in XC_REF.finditer(text or ""):
            add(match.group(1), match.group(2), top, path)
    return refs


def unique(paths):
    seen, kept = set(), []
    for path in paths:
        real = os.path.realpath(path)
        if real not in seen:
            seen.add(real)
            kept.append(path)
    return sorted(kept)


def check_info(path, label, release, allow):
    try:
        info = read_plist(path)
    except Unreadable as error:
        refuse(str(error))
        return None
    ats = info.get("NSAppTransportSecurity")
    if ats is not None and not isinstance(ats, dict):
        refuse("%s: NSAppTransportSecurity is not a dictionary" % label)
    elif ats is not None:
        for key in sorted(ats):
            if key not in ATS_KEYS:
                refuse("%s: NSAppTransportSecurity holds %s, a key this check does not read" % (label, key))
        if "NSAllowsArbitraryLoads" in ats and ats["NSAllowsArbitraryLoads"] is not False:
            refuse("%s: NSAllowsArbitraryLoads must be absent or false" % label)
        for key in LOOSENERS:
            if key not in ats or ats[key] is False:
                continue
            if release:
                refuse("%s: %s must be absent or false in the Release app" % (label, key))
            elif key not in allow["ats"]["debug_only"]:
                refuse("%s: %s must be absent or false (or listed in the allow-list's ats.debug_only, with the build "
                       "step that removes it from Release)" % (label, key))
        domains = ats.get("NSExceptionDomains")
        if domains is not None and not isinstance(domains, dict):
            refuse("%s: NSExceptionDomains is not a dictionary" % label)
        elif domains is not None:
            for domain in sorted(domains):
                entry = allow["ats"]["exception_domains"].get(domain)
                if entry is None:
                    refuse("%s: the exception domain %s is not in %s" % (label, domain, allow_path))
                elif canonical(domains[domain]) != canonical(entry["settings"]):
                    refuse("%s: the exception domain %s has the settings %s, not the %s the allow-list gives"
                           % (label, domain, canonical(domains[domain]), canonical(entry["settings"])))
    modes = info.get("UIBackgroundModes")
    if modes is not None and not (isinstance(modes, list) and all(isinstance(m, str) for m in modes)):
        refuse("%s: UIBackgroundModes is not a list of strings" % label)
    elif modes is not None:
        for mode in modes:
            if mode not in allow["background_modes"]:
                refuse("%s: the background mode %s is not in %s" % (label, mode, allow_path))
    return info


def check_entitlements(path, allow):
    try:
        held = read_plist(path)
    except Unreadable as error:
        refuse(str(error))
        return
    for key in sorted(held):
        entry = allow["entitlements"].get(key)
        if entry is None:
            refuse("%s: the entitlement %s is not in %s" % (path, key, allow_path))
            continue
        value, kind = held[key], entry["type"]
        if kind == "array" and isinstance(value, list) and all(type(v) is str for v in value):
            items = value
        elif kind != "array" and type(value) is TYPES[kind]:
            items = [value]
        else:
            refuse("%s: the entitlement %s is not a%s %s, as the allow-list says" % (path, key, "n" if kind == "array" else "", kind))
            continue
        for item in items:
            if not any(type(item) is type(a) and item == a for a in entry["values"]):
                refuse("%s: the entitlement %s holds %s, which the allow-list does not allow" % (path, key, json.dumps(item)))


def contains(data, text):
    return data.find(text.encode("utf-8")) >= 0 or data.find(text.encode("utf-16-le")) >= 0


def check_bundle_file(label, path, allow):
    try:
        with open(path, "rb") as handle:
            data = handle.read()
    except OSError as error:
        refuse("cannot read the Release %s %s (%s)" % (label, path, error.strerror))
        return
    canary = allow["release_bundle"]["canaries"][label]
    if not contains(data, canary):
        refuse("cannot read the Release %s %s: its known string %s is not in it, so a deny-listed string would not be "
               "seen either" % (label, path, canary))
        return
    for entry in allow["release_bundle"]["deny"]:
        if label in entry["in"] and contains(data, entry["string"]):
            refuse("%s reached the Release %s (%s): %s" % (entry["string"], label, path, entry["reason"]))


allow = load_allow(allow_path)
if not os.path.isdir(root):
    cannot_run("%s is not a folder" % root)
found = walk(root)
refs = referenced(found, root)
plists = unique(found["plist"] + refs["INFOPLIST_FILE"])
entitlement_files = unique(found["entitlements"] + refs["CODE_SIGN_ENTITLEMENTS"])
if not plists:
    refuse("no Info.plist under %s: the check has nothing to read" % root)
for path in plists:
    check_info(path, path, False, allow)
for path in entitlement_files:
    check_entitlements(path, allow)

built = None
if app:
    info_path = os.path.join(app, "Info.plist")
    info = check_info(info_path, "the Release app's Info.plist (%s)" % info_path, True, allow)
    plugins = os.path.join(app, "PlugIns")
    if os.path.isdir(plugins):
        for name in sorted(os.listdir(plugins)):
            if name.endswith(".appex"):
                extension = os.path.join(plugins, name, "Info.plist")
                check_info(extension, "the Release extension's Info.plist (%s)" % extension, True, allow)
    targets = [("jsbundle", os.path.join(app, "main.jsbundle"))]
    executable = info.get("CFBundleExecutable") if info is not None else None
    if isinstance(executable, str) and executable and "/" not in executable:
        targets.insert(0, ("binary", os.path.join(app, executable)))
        if os.path.isfile(targets[0][1]):
            stamp = os.path.getmtime(targets[0][1])
            built = datetime.datetime.fromtimestamp(stamp, datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    elif info is not None:
        refuse("the Release app's Info.plist (%s) names no executable (CFBundleExecutable), so its binary cannot be "
               "read" % info_path)
    for label, path in targets:
        check_bundle_file(label, path, allow)

if problems:
    for problem in problems:
        print("ios: refused: " + problem, file=sys.stderr)
    print("ios: %d refusal(s); what may be declared is in %s" % (len(problems), allow_path), file=sys.stderr)
    sys.exit(1)
print("ios: passed: %d Info.plist file(s), %d entitlements file(s)" % (len(plists), len(entitlement_files)))
for path in plists + entitlement_files:
    print("  " + path)
if not entitlement_files:
    print("  (no entitlements file yet: the first one is checked against the allow-list)")
if app:
    print("ios: passed: the Release app's Info.plist, binary and main.jsbundle (%s, built %s)" % (app, built))
PY

scan_ios() {
  if [[ "$host_os" != Darwin ]]; then
    echo "security_scan: ios mode needs macOS (MA-166: iOS checks run on the laptop)" >&2
    exit 2
  fi
  step "ios: Info.plist and entitlements against scripts/security/ios-allow.json, and the built Release app (MA-363)"
  command -v plutil >/dev/null || { echo "security_scan: ios mode needs plutil, which macOS carries" >&2; exit 2; }
  local root="${SECURITY_SCAN_IOS_ROOT:-ios}" allow="${SECURITY_SCAN_IOS_ALLOW:-scripts/security/ios-allow.json}"
  local release="Build/Products/Release-iphonesimulator/MyPaisa.app" app=""
  if [[ -n "${MP_DERIVED_DATA:-}" ]]; then
    app="$MP_DERIVED_DATA/$release"
    [[ -d "$app" ]] || { echo "security_scan: MP_DERIVED_DATA is set but holds no Release app at $app" >&2; exit 2; }
  elif [[ -d "$root/build/DerivedData/$release" ]]; then
    app="$root/build/DerivedData/$release"
  fi
  python3 -I -c "$IOS_CHECK" "$root" "$allow" "$app"
  if [[ -z "$app" ]]; then
    echo "ios: no built Release app at $root/build/DerivedData/$release, so its bundle was not checked (scripts/ios_gates.sh builds it)"
    not_run="${not_run:+$not_run; }the Release bundle checks (no built Release app)"
    return 0
  fi
  step "ios: gitleaks ${GITLEAKS_VERSION} over the Release app and its binary's strings"
  local archive dir="$CACHE/gitleaks-${GITLEAKS_VERSION}" executable
  archive=$(fetch "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${GITLEAKS_ASSET}" "$GITLEAKS_ASSET" "$GITLEAKS_SHA")
  mkdir -p "$dir" && tar -xzf "$archive" -C "$dir" gitleaks
  # gitleaks passes over a file it takes for binary, so the executable's strings are scanned as text beside the bundle.
  # Not local: the trap reads it after the function returns. The repo's .gitleaks.toml applies here as to the history.
  ios_strings=$(mktemp -d)
  trap 'rm -rf "$ios_strings"' EXIT
  executable=$(plutil -extract CFBundleExecutable raw -o - "$app/Info.plist")
  strings -a "$app/$executable" > "$ios_strings/$executable.strings"
  "$dir/gitleaks" dir --config .gitleaks.toml --no-banner --redact --exit-code 1 "$app"
  "$dir/gitleaks" dir --config .gitleaks.toml --no-banner --redact --exit-code 1 "$ios_strings"
}

# swift-proof: the semgrep rules `sast` runs on Swift must catch each fault planted below, and must not count a
# protection; the ios selftest cannot show this offline. It fetches semgrep, so it runs on Arun's yes (MA-363).
IFS= read -r -d '' SWIFT_PLANTED <<'SWIFT' || true
// Planted by scripts/security_scan.sh swift-proof (MA-363): each fault below must be caught by semgrep's Swift rules.
// Written to a temporary folder for one run, never into the app.
import CommonCrypto
import Foundation
import Security
import SwiftUI

let password = "planted-not-a-secret"

func plantedStore(token: String) {
  UserDefaults.standard.set(password, forKey: "password")
  let query: [String: Any] = [kSecAttrAccessible as String: kSecAttrAccessibleAlways]
  _ = SecItemAdd(query as CFDictionary, nil)
  NSLog("token %@", token)
}

func plantedDigest(_ data: [UInt8]) -> [UInt8] {
  var digest = [UInt8](repeating: 0, count: Int(CC_MD5_DIGEST_LENGTH))
  _ = CC_MD5(data, CC_LONG(data.count), &digest)
  return digest
}

struct PlantedField: View {
  @State private var text = ""
  var body: some View {
    TextField("Account", text: $text).autocorrectionDisabled(true)
  }
}
SWIFT

IFS= read -r -d '' SWIFT_EXPECT <<'PY' || true
import json, sys

caught = {
    "swift.lang.storage.sensitive-storage-userdefaults.swift-user-defaults": "UserDefaults.standard.set(password, ...)",
    "mobsf.mobsfscan.swift.secrets.ios_hardcoded_secret": 'let password = "..."',
    "mobsf.mobsfscan.swift.auth.ios_keychain_weak_accessibility_value": "kSecAttrAccessibleAlways",
    "mobsf.mobsfscan.swift.logging.ios_log": "NSLog of the token",
    "mobsf.mobsfscan.swift.crypto.ios_weak_hash": "CC_MD5(",
}
left_out = {"mobsf.mobsfscan.best_practices.swift.keyboard.ios_keyboard_cache": ".autocorrectionDisabled(true), a protection"}
with open(sys.argv[1], encoding="utf-8") as handle:
    report = json.load(handle)
ids = {r["check_id"] for r in report["results"]}
seen = lambda rule: any(i == rule or i.endswith("." + rule) for i in ids)
missed = [r for r in caught if not seen(r)] + [r for r in left_out if seen(r)]
for rule, what in caught.items():
    print("%s %s: %s" % ("caught" if seen(rule) else "MISSED", rule, what))
for rule, what in left_out.items():
    print("%s %s: %s" % ("WRONGLY COUNTED" if seen(rule) else "left out", rule, what))
for error in report.get("errors", []):
    print("semgrep error: %s" % error.get("message", error))
sys.exit(1 if missed or report.get("errors") else 0)
PY

swift_proof() {
  step "swift proof: semgrep ${SEMGREP_VERSION}'s Swift rules on a planted file (MA-363)"
  # Not local: the trap reads it after the function returns.
  planted=$(mktemp -d)
  trap 'rm -rf "$planted"' EXIT
  printf '%s' "$SWIFT_PLANTED" > "$planted/Planted.swift"
  uvx "semgrep==${SEMGREP_VERSION}" scan --metrics=off --quiet --json --output "$planted/found.json" \
    "${SWIFT_RULES[@]}" "$planted/Planted.swift"
  python3 -I -c "$SWIFT_EXPECT" "$planted/found.json"
}

case "$which" in
  all)
    scan_secrets; scan_sast; scan_deps; scan_workflows
    if [[ "$host_os" == Darwin ]]; then
      scan_ios
    else
      step "ios: not run on $host_os (MA-166: iOS checks run on the laptop)"
      not_run="${not_run:+$not_run; }ios (needs macOS)"
    fi ;;
  secrets) scan_secrets ;; sast) scan_sast ;; deps) scan_deps ;; workflows) scan_workflows ;; staged) scan_staged ;;
  ios) scan_ios ;; swift-proof) swift_proof ;;
  *) echo "usage: $0 [all|secrets|sast|deps|workflows|ios|staged|selftest|swift-proof]" >&2; exit 2 ;;
esac
if [[ -n "$not_run" ]]; then
  printf '\nsecurity scans: all passed; not run: %s\n' "$not_run"
else
  printf '\nsecurity scans: all passed\n'
fi
