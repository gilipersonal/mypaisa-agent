#!/usr/bin/env python3
"""The local Maestro runner for the iOS app (MA-273, .claude/rules/testing.md).

  maestro_local.py doctor [--os 26.5]
  maestro_local.py setup-pool [--os 26.5]
  maestro_local.py build [--derived-data ios/build/DerivedData] [--no-build] [--no-bundle] [--include-interactive]
  maestro_local.py run --device MP-QA-iPhone [--tags smoke] [--exclude-tags ...] [--width 744] [--flows .maestro/flows]
  maestro_local.py check-syntax [--flows .maestro] [--no-maestro]
  maestro_local.py selftest

A pool of simulators made for the CLI: MP-QA-iPhone (iPhone 17 Pro), MP-QA-iPad (iPad Pro 11-inch (M5)) and
MP-QA-Fold (iPhone Duo on iOS 27.1, made only when Xcode 27.1 is installed), one crew:qa-ios lane on each.
MP-Interactive is the lead's and the Maestro MCP's: `run` refuses it, because a CLI run reinstalls Maestro's driver
and breaks a live MCP session on that device. One owner per device at a time, held by an fcntl lock per UDID in
~/Library/Caches/mypaisa-maestro/.

The app is told where to go through its Debug-only MYPAISA_* environment (ios/MyPaisa/AppConfig.swift): `run`
sets SIMCTL_CHILD_MYPAISA_* in Maestro's environment, which `xcrun simctl launch` hands to the app, and passes
the same values to the flows as APP_ID, API_URL and VIEWPORT_WIDTH with `-e`.

Each device runs only the flows that carry its own tag (iphone, ipad, foldable). Maestro's --include-tags is an
OR, so `run` reads each flow's `tags:` itself and hands Maestro the chosen files: a flow runs when it has the
device's tag, at least one --tags (when given) and none of --exclude-tags.

Nothing here deletes or erases a simulator. Every command has a hard time limit; its process group is killed when
it runs over.

Exit codes: 0 done; 1 a check failed (doctor not ready, check-syntax problems, selftest failure, build failure);
2 usage error or refusal (MP-Interactive, an unknown device); 3 not ready (a tool, device, boot or app missing);
4 the device is held by another run; 124 a command ran over its time limit. `run` otherwise exits with Maestro's
own status.
"""

from __future__ import annotations

import argparse
import contextlib
import fcntl
import json
import os
import plistlib
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from collections.abc import Callable, Iterator, Sequence
from dataclasses import dataclass, field
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
APP_ID = "com.mypaisapp.agent.dev"
APP_NAME = "MyPaisa.app"
SCHEME = "MyPaisa Dev"
PROJECT = "ios/MyPaisa.xcodeproj"
DEFAULT_OS = os.environ.get("MP_SIMULATOR_OS", "26.5")
DEFAULT_DERIVED = os.environ.get("MP_DERIVED_DATA", "ios/build/DerivedData")
DEFAULT_API_URL = "http://localhost:8787"
FOLD_OS = "27.1"
FOLD_XCODE = Path(os.environ.get("MP_FOLD_XCODE", "/Applications/Xcode-27.1-beta.app"))
LOCK_DIR = Path(os.environ.get("MP_MAESTRO_LOCK_DIR", str(Path.home() / "Library/Caches/mypaisa-maestro")))
TEST_IDS = "ios/MyPaisaCore/Testing/TestIDs.swift"
RN_CLI = "ios/node_modules/.bin/react-native"
MAESTRO_MAJOR_MINOR = "2.11."
FLOW_APP_IDS = ("${APP_ID}", APP_ID)

OK, FAIL, USAGE, NOT_READY, BUSY, TIMEOUT = 0, 1, 2, 3, 4, 124

# Time limits, in seconds.
T_QUICK = 60
T_BOOT = 300
T_INSTALL = 300
T_SPM = 600
T_BUILD = 1800
T_RUN = int(os.environ.get("MP_MAESTRO_RUN_TIMEOUT", "3600"))


class MaestroLocalError(Exception):
    """An expected failure: printed as one line, never a traceback."""

    def __init__(self, code: int, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class Device:
    name: str
    device_type: str
    os: str | None  # None: the --os the command was given
    owner: str
    optional: bool = False
    xcode: Path | None = None  # a DEVELOPER_DIR this device needs, when not the system Xcode
    tag: str = ""  # the flow tag that marks a flow as holding on this device


POOL = (
    Device("MP-QA-iPhone", "iPhone 17 Pro", None, "qa-ios", tag="iphone"),
    Device("MP-QA-iPad", "iPad Pro 11-inch (M5)", None, "qa-ios", tag="ipad"),
    Device("MP-QA-Fold", "iPhone Duo", FOLD_OS, "qa-ios", optional=True, xcode=FOLD_XCODE, tag="foldable"),
)
INTERACTIVE = Device("MP-Interactive", "iPhone 17 Pro", None, "lead")
ALL_DEVICES = (*POOL, INTERACTIVE)


# ---------------------------------------------------------------------------------------------------------------
# Running commands


@dataclass
class Result:
    code: int
    out: str = ""
    err: str = ""


Runner = Callable[..., Result]


def run_cmd(
    argv: Sequence[str],
    timeout: float,
    env: dict[str, str] | None = None,
    capture: bool = True,
    cwd: Path | None = None,
) -> Result:
    """Run argv with a hard time limit; on overrun kill its whole process group and raise TIMEOUT."""
    try:
        proc = subprocess.Popen(
            list(argv),
            stdout=subprocess.PIPE if capture else None,
            stderr=subprocess.PIPE if capture else None,
            stdin=subprocess.DEVNULL,
            text=True,
            env=env,
            cwd=cwd,
            start_new_session=True,
        )
    except FileNotFoundError as exc:
        raise MaestroLocalError(NOT_READY, f"{argv[0]} not found: {exc.strerror}") from None
    try:
        out, err = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        for sig in (signal.SIGTERM, signal.SIGKILL):
            with contextlib.suppress(ProcessLookupError):
                os.killpg(proc.pid, sig)
            try:
                proc.wait(timeout=10)
                break
            except subprocess.TimeoutExpired:
                continue
        raise MaestroLocalError(TIMEOUT, f"{' '.join(argv[:3])} ran over its {int(timeout)} s limit and was stopped") from None
    except KeyboardInterrupt:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(proc.pid, signal.SIGTERM)
        raise
    return Result(proc.returncode, out or "", err or "")


@dataclass
class Ctx:
    runner: Runner = run_cmd
    repo: Path = REPO
    lock_dir: Path = LOCK_DIR
    fold_xcode: Path = FOLD_XCODE
    out: Callable[[str], None] = print
    maestro: str | None = None
    calls: list[list[str]] = field(default_factory=list)

    def say(self, line: str) -> None:
        self.out(line)

    def run(self, argv: Sequence[str], timeout: float, xcode: Path | None = None, **kw: object) -> Result:
        env = kw.pop("env", None)
        if xcode is not None:
            env = dict(env or os.environ)
            env["DEVELOPER_DIR"] = str(xcode / "Contents/Developer")
        self.calls.append(list(argv))
        return self.runner(argv, timeout, env=env, **kw)

    def simctl(self, *args: str, timeout: float = T_QUICK, xcode: Path | None = None) -> Result:
        return self.run(["xcrun", "simctl", *args], timeout, xcode=xcode)

    def simctl_json(self, *args: str, xcode: Path | None = None) -> dict:
        res = self.simctl(*args, "-j", xcode=xcode)
        if res.code != 0:
            raise MaestroLocalError(NOT_READY, f"xcrun simctl {' '.join(args)} failed: {tail(res.err or res.out)}")
        try:
            return json.loads(res.out)
        except json.JSONDecodeError:
            raise MaestroLocalError(NOT_READY, f"xcrun simctl {' '.join(args)} did not return JSON") from None

    def device_xcode(self, dev: Device) -> Path | None:
        return self.fold_xcode if dev.xcode is not None else None


def tail(text: str, lines: int = 6) -> str:
    return " | ".join(line for line in text.strip().splitlines()[-lines:]) or "(no output)"


def find_maestro() -> str | None:
    found = shutil.which("maestro")
    if found:
        return found
    fallback = Path.home() / ".maestro/bin/maestro"
    return str(fallback) if fallback.is_file() and os.access(fallback, os.X_OK) else None


# ---------------------------------------------------------------------------------------------------------------
# Simulators


@dataclass
class SimDevice:
    name: str
    udid: str
    state: str
    runtime: str
    available: bool


def runtime_id(version: str) -> str:
    return "com.apple.CoreSimulator.SimRuntime.iOS-" + version.replace(".", "-")


def list_devices(ctx: Ctx) -> list[SimDevice]:
    data = ctx.simctl_json("list", "devices")
    found = []
    for runtime, devices in (data.get("devices") or {}).items():
        for d in devices:
            found.append(
                SimDevice(d.get("name", ""), d.get("udid", ""), d.get("state", "?"), runtime, bool(d.get("isAvailable", False)))
            )
    return found


def named(devices: list[SimDevice], name: str) -> list[SimDevice]:
    return [d for d in devices if d.name == name]


def one_device(devices: list[SimDevice], name: str) -> SimDevice | None:
    matches = named(devices, name)
    if len(matches) > 1:
        udids = ", ".join(d.udid for d in matches)
        raise MaestroLocalError(NOT_READY, f"{len(matches)} simulators are named {name} ({udids}); keep one, by hand")
    return matches[0] if matches else None


def pool_device(name: str) -> Device:
    if name == INTERACTIVE.name:
        raise MaestroLocalError(
            USAGE,
            f"{name} is the lead's and the Maestro MCP's: a CLI run reinstalls the driver and breaks a live MCP "
            f"session. Use one of {', '.join(d.name for d in POOL)} (.claude/rules/testing.md)",
        )
    for dev in POOL:
        if dev.name == name:
            return dev
    raise MaestroLocalError(USAGE, f"unknown device {name!r}: use one of {', '.join(d.name for d in POOL)}")


def runtime_short(runtime: str) -> str:
    return runtime.rsplit(".", 1)[-1]


# ---------------------------------------------------------------------------------------------------------------
# The lock: one Maestro owner per simulator


def acquire_lock(lock_dir: Path, udid: str) -> int:
    """Take the device's exclusive lock, or raise BUSY. The lock holds while the returned fd stays open."""
    lock_dir.mkdir(parents=True, exist_ok=True)
    path = lock_dir / f"{udid}.lock"
    fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        holder = ""
        with contextlib.suppress(OSError):
            holder = os.pread(fd, 200, 0).decode(errors="replace").strip()
        os.close(fd)
        raise MaestroLocalError(BUSY, f"{udid} is in use by another Maestro run ({holder or 'holder unknown'}): {path}") from None
    os.ftruncate(fd, 0)
    os.write(fd, f"pid {os.getpid()} since {time.strftime('%Y-%m-%d %H:%M:%S')}\n".encode())
    return fd


def lock_state(lock_dir: Path, udid: str) -> str:
    """Read only: whether a lock file exists and is held."""
    path = lock_dir / f"{udid}.lock"
    if not path.exists():
        return "free"
    fd = os.open(path, os.O_RDONLY)
    try:
        fcntl.flock(fd, fcntl.LOCK_SH | fcntl.LOCK_NB)
    except OSError:
        holder = os.pread(fd, 200, 0).decode(errors="replace").strip()
        return f"held ({holder or 'holder unknown'})"
    finally:
        os.close(fd)
    return "free"


# ---------------------------------------------------------------------------------------------------------------
# doctor


def xcode_version(app: Path) -> str | None:
    plist = app / "Contents/version.plist"
    if not plist.is_file():
        plist = app / "Contents/Info.plist"
    try:
        with plist.open("rb") as f:
            return plistlib.load(f).get("CFBundleShortVersionString")
    except (OSError, plistlib.InvalidFileException):
        return None


def cmd_doctor(args: argparse.Namespace, ctx: Ctx) -> int:
    problems: list[str] = []

    def line(status: str, what: str) -> None:
        ctx.say(f"  {status:<8}{what}")

    ctx.say("tools")
    maestro = ctx.maestro or find_maestro()
    if maestro is None:
        line("missing", "maestro (install it: curl -fsSL https://get.maestro.mobile.dev | bash)")
        problems.append("maestro")
    else:
        res = ctx.run([maestro, "--version"], T_QUICK)
        version = res.out.strip().splitlines()[-1] if res.out.strip() else "?"
        on_path = shutil.which("maestro") is not None
        status = "ok" if version.startswith(MAESTRO_MAJOR_MINOR) else "warn"
        line(status, f"maestro {version} at {maestro}" + ("" if status == "ok" else f" (expected {MAESTRO_MAJOR_MINOR}x)"))
        if not on_path:
            line("warn", "maestro is not on this shell's PATH; .mcp.json adds ~/.maestro/bin for the MCP")
    java = shutil.which("java")
    if java is None:
        line("missing", "java (Maestro needs a JDK)")
        problems.append("java")
    else:
        res = ctx.run([java, "-version"], T_QUICK)
        first = (res.err or res.out).strip().splitlines()[:1]
        line("ok" if res.code == 0 else "missing", f"java: {first[0] if first else '?'}")
        if res.code != 0:
            problems.append("java")
    res = ctx.run(["xcode-select", "-p"], T_QUICK)
    dev_dir = res.out.strip()
    if res.code == 0 and dev_dir:
        app = Path(dev_dir).parent.parent
        line("ok", f"Xcode {xcode_version(app) or '?'} at {app} (system default)")
    else:
        line("missing", "xcode-select -p: no Xcode selected")
        problems.append("xcode")
    fold_ok = ctx.fold_xcode.is_dir()
    line(
        "ok" if fold_ok else "note",
        f"Xcode {xcode_version(ctx.fold_xcode) or '27.1'} at {ctx.fold_xcode} (for MP-QA-Fold)"
        if fold_ok
        else f"no Xcode 27.1 at {ctx.fold_xcode}: MP-QA-Fold is skipped (optional)",
    )

    ctx.say("simulators")
    try:
        runtimes = ctx.simctl_json("list", "runtimes")
        devices = list_devices(ctx)
    except MaestroLocalError as exc:
        line("missing", f"xcrun simctl: {exc}")
        problems.append("simctl")
        runtimes, devices = {"runtimes": []}, []
    available = {r.get("identifier") for r in runtimes.get("runtimes", []) if r.get("isAvailable")}
    for version in sorted({args.os, FOLD_OS}):
        rid = runtime_id(version)
        line("ok" if rid in available else "missing", f"runtime iOS {version}")
        if rid not in available and version == args.os:
            problems.append(f"runtime iOS {version}")
    for dev in ALL_DEVICES:
        matches = named(devices, dev.name)
        want = f"{dev.device_type}, iOS {dev.os or args.os}"
        if not matches:
            status = "note" if dev.optional else "missing"
            line(status, f"{dev.name} ({want}, {dev.owner}): not made yet: run setup-pool")
            if not dev.optional:
                problems.append(dev.name)
            continue
        if len(matches) > 1:
            line("missing", f"{dev.name}: {len(matches)} simulators share the name; keep one, by hand")
            problems.append(dev.name)
            continue
        d = matches[0]
        extra = ""
        if not d.available:
            extra = " UNAVAILABLE (its runtime is gone)"
            problems.append(dev.name)
        elif d.state == "Booted":
            res = ctx.simctl("get_app_container", d.udid, APP_ID, xcode=ctx.device_xcode(dev))
            extra = ", app installed" if res.code == 0 else ", app not installed: run build"
        lock = lock_state(ctx.lock_dir, d.udid) if dev in POOL else "MCP's"
        line(
            "ok" if d.available else "missing",
            f"{dev.name} {d.udid} {d.state} {runtime_short(d.runtime)} ({dev.owner}, lock {lock}){extra}",
        )

    ctx.say("workspace")
    maestro_dir = ctx.repo / ".maestro"
    if maestro_dir.is_dir():
        flows = sorted(p for p in maestro_dir.rglob("*") if p.suffix in (".yaml", ".yml"))
        line("ok", f".maestro/ with {len(flows)} YAML files")
    else:
        line("missing", ".maestro/ (crew:tester writes the flows)")
        problems.append(".maestro")
    app = ctx.repo / args.derived_data / "Build/Products/Debug-iphonesimulator" / APP_NAME
    line("ok" if app.is_dir() else "note", f"{APP_NAME} built at {app.relative_to(ctx.repo) if app.is_relative_to(ctx.repo) else app}" if app.is_dir() else "app not built yet: run build")
    ids = ctx.repo / TEST_IDS
    line("ok" if ids.is_file() else "missing", TEST_IDS)

    if problems:
        ctx.say(f"not ready: {', '.join(problems)}")
        return FAIL
    ctx.say("ready")
    return OK


# ---------------------------------------------------------------------------------------------------------------
# setup-pool


def cmd_setup_pool(args: argparse.Namespace, ctx: Ctx) -> int:
    devices = list_devices(ctx)
    failed = False
    for dev in ALL_DEVICES:
        version = dev.os or args.os
        xcode = ctx.device_xcode(dev)
        if dev.xcode is not None and not ctx.fold_xcode.is_dir():
            ctx.say(f"skip    {dev.name}: no Xcode at {ctx.fold_xcode} ({dev.device_type} needs Xcode {version}); optional")
            continue
        existing = named(devices, dev.name)
        if len(existing) > 1:
            ctx.say(f"FAIL    {dev.name}: {len(existing)} simulators share the name ({', '.join(d.udid for d in existing)}); keep one, by hand")
            failed = True
            continue
        if existing:
            d = existing[0]
            note = "" if runtime_short(d.runtime) == runtime_short(runtime_id(version)) else f" (on {runtime_short(d.runtime)}, not iOS {version}; left as it is)"
            if not d.available:
                ctx.say(f"FAIL    {dev.name} {d.udid}: unavailable, its runtime is gone; delete it by hand, then run setup-pool")
                failed = True
                continue
            ctx.say(f"exists  {dev.name} {d.udid} {d.state}{note}")
            continue
        types = ctx.simctl_json("list", "devicetypes", xcode=xcode).get("devicetypes", [])
        type_id = next((t.get("identifier") for t in types if t.get("name") == dev.device_type), None)
        if type_id is None:
            ctx.say(f"FAIL    {dev.name}: no device type {dev.device_type!r} in this Xcode")
            failed = failed or not dev.optional
            continue
        runtimes = ctx.simctl_json("list", "runtimes", xcode=xcode).get("runtimes", [])
        rid = runtime_id(version)
        if not any(r.get("identifier") == rid and r.get("isAvailable") for r in runtimes):
            ctx.say(f"FAIL    {dev.name}: runtime iOS {version} is not installed")
            failed = failed or not dev.optional
            continue
        res = ctx.simctl("create", dev.name, type_id, rid, xcode=xcode)
        if res.code != 0:
            ctx.say(f"FAIL    {dev.name}: simctl create: {tail(res.err or res.out)}")
            failed = failed or not dev.optional
            continue
        ctx.say(f"created {dev.name} {res.out.strip()} ({dev.device_type}, iOS {version})")
    return FAIL if failed else OK


# ---------------------------------------------------------------------------------------------------------------
# build


def boot(ctx: Ctx, dev: Device, sim: SimDevice) -> None:
    xcode = ctx.device_xcode(dev)
    if sim.state != "Booted":
        res = ctx.simctl("boot", sim.udid, timeout=T_BOOT, xcode=xcode)
        if res.code != 0 and "current state: Booted" not in (res.err + res.out):
            raise MaestroLocalError(NOT_READY, f"{dev.name}: simctl boot: {tail(res.err or res.out)}")
    res = ctx.simctl("bootstatus", sim.udid, "-b", timeout=T_BOOT, xcode=xcode)
    if res.code != 0:
        raise MaestroLocalError(NOT_READY, f"{dev.name}: simctl bootstatus: {tail(res.err or res.out)}")


def cmd_build(args: argparse.Namespace, ctx: Ctx) -> int:
    derived = ctx.repo / args.derived_data
    app = derived / "Build/Products/Debug-iphonesimulator" / APP_NAME
    if not args.no_build:
        # React Native's Swift packages first, as scripts/ios_gates.sh does: ios/build/ is not committed, so a clean
        # checkout has none and xcodebuild cannot resolve them. Fails closed: no packages, no build.
        ctx.say("spm     react-native spm update --yes, in ios/")
        try:
            res = ctx.run([str(ctx.repo / RN_CLI), "spm", "update", "--yes"], T_SPM, cwd=ctx.repo / "ios")
        except MaestroLocalError as exc:
            if exc.code == TIMEOUT:
                raise
            raise MaestroLocalError(NOT_READY, f"{exc}; run corepack pnpm@12.16.1 --dir web install") from None
        if res.code != 0:
            ctx.say(tail(res.out + "\n" + res.err, 25))
            raise MaestroLocalError(FAIL, f"react-native spm update failed (exit {res.code}); xcodebuild not run")
        argv = [
            "xcodebuild", "build", "-project", PROJECT, "-scheme", SCHEME, "-configuration", "Debug",
            "-destination", "generic/platform=iOS Simulator", "-derivedDataPath", str(derived),
            "CODE_SIGNING_ALLOWED=NO",
        ]
        env = dict(os.environ)
        if not args.no_bundle:
            # A Debug build for the simulator skips the JavaScript bundle and expects Metro; the pool runs with no
            # Metro, so the bundle goes into the app. The app still prefers Metro when one is running.
            env["FORCE_BUNDLING"] = "1"
        ctx.say(f"build   {SCHEME} (Debug) into {derived}" + ("" if args.no_bundle else ", JavaScript bundled"))
        res = ctx.run(argv, T_BUILD, env=env, cwd=ctx.repo)
        if res.code != 0:
            ctx.say(tail(res.out + "\n" + res.err, 25))
            raise MaestroLocalError(FAIL, f"xcodebuild failed (exit {res.code})")
    if not app.is_dir():
        raise MaestroLocalError(NOT_READY, f"no app at {app}: build it first (drop --no-build)")
    devices = list_devices(ctx)
    targets = [*POOL, INTERACTIVE] if args.include_interactive else list(POOL)
    failed = False
    for dev in targets:
        if dev.xcode is not None and not ctx.fold_xcode.is_dir():
            ctx.say(f"skip    {dev.name}: no Xcode at {ctx.fold_xcode}; optional")
            continue
        sim = one_device(devices, dev.name)
        if sim is None:
            if dev.optional:
                ctx.say(f"skip    {dev.name}: not made; run setup-pool")
                continue
            ctx.say(f"FAIL    {dev.name}: not made; run setup-pool")
            failed = True
            continue
        try:
            boot(ctx, dev, sim)
            res = ctx.simctl("install", sim.udid, str(app), timeout=T_INSTALL, xcode=ctx.device_xcode(dev))
            if res.code != 0:
                raise MaestroLocalError(NOT_READY, f"{dev.name}: simctl install: {tail(res.err or res.out)}")
        except MaestroLocalError as exc:
            if exc.code == TIMEOUT:
                raise
            ctx.say(f"FAIL    {exc}")
            failed = True
            continue
        ctx.say(f"ready   {dev.name} {sim.udid}: booted, {APP_ID} installed")
    return FAIL if failed else OK


# ---------------------------------------------------------------------------------------------------------------
# run


def split_tags(values: list[str] | None) -> list[str]:
    tags: list[str] = []
    for value in values or []:
        tags += [t.strip().lstrip("@") for t in value.split(",") if t.strip()]
    return tags


def flow_tags(path: Path) -> list[str]:
    """The `tags:` list in a flow's first YAML document, block (`- x`) or inline (`[x, y]`)."""
    docs = split_documents(path.read_text(errors="replace"))
    if len(docs) < 2:
        return []
    tags: list[str] = []
    in_tags = False
    for _, line in meaningful(docs[0]):
        if line.startswith("tags:"):
            rest = line.split(":", 1)[1].split(" #", 1)[0].strip()
            if rest.startswith("["):
                tags += [t.strip().strip("\"'") for t in rest.strip("[]").split(",") if t.strip()]
            in_tags = not rest
            continue
        if in_tags and line.startswith((" ", "-")) and line.lstrip().startswith("-"):
            tags.append(line.lstrip()[1:].split(" #", 1)[0].strip().strip("\"'"))
        elif not line.startswith(" "):
            in_tags = False
    return tags


def select_flows(root: Path, device_tag: str, include: list[str], exclude: list[str]) -> list[Path]:
    """The flows this device runs: its own tag, AND one of include (when given), AND none of exclude."""
    if root.is_file():
        candidates = [root]
    else:
        candidates = sorted(
            p for p in root.rglob("*")
            if p.is_file() and p.suffix in (".yaml", ".yml") and "subflows" not in p.relative_to(root).parts
            and p.name not in ("config.yaml", "config.yml")
        )
    chosen = []
    for path in candidates:
        tags = set(flow_tags(path))
        if device_tag in tags and (not include or tags & set(include)) and not tags & set(exclude):
            chosen.append(path)
    return chosen


def maestro_argv(maestro: str, udid: str, flows: list[Path], out_dir: Path, args: argparse.Namespace) -> list[str]:
    argv = [
        maestro, "--device", udid, "test", *map(str, flows),
        "--format", "JUNIT", "--output", str(out_dir / "report.xml"), "--test-output-dir", str(out_dir),
    ]
    flow_env = {
        "APP_ID": APP_ID,
        "API_URL": args.api_url,
        "VIEWPORT_WIDTH": "" if args.width is None else str(args.width),
    }
    for key, value in flow_env.items():
        argv += ["-e", f"{key}={value}"]
    return argv


def app_env(args: argparse.Namespace) -> dict[str, str]:
    """What `xcrun simctl launch` hands the app: SIMCTL_CHILD_X becomes X in the app's environment."""
    env = {"SIMCTL_CHILD_MYPAISA_API_URL": args.api_url, "SIMCTL_CHILD_MYPAISA_STATIC_MOTION": "1"}
    if args.width is not None:
        env["SIMCTL_CHILD_MYPAISA_VIEWPORT_WIDTH"] = str(args.width)
    return env


def cmd_run(args: argparse.Namespace, ctx: Ctx) -> int:
    dev = pool_device(args.device)  # refuses MP-Interactive before anything else runs
    flows = (ctx.repo / args.flows).resolve()
    if not flows.exists():
        raise MaestroLocalError(NOT_READY, f"no flows at {flows}")
    include, exclude = split_tags(args.tags), split_tags(args.exclude_tags)
    chosen = select_flows(flows, dev.tag, include, exclude)
    if not chosen:
        wanted = f"tag {dev.tag}" + (f" and one of {', '.join(include)}" if include else "") + (f", none of {', '.join(exclude)}" if exclude else "")
        raise MaestroLocalError(FAIL, f"no flow under {flows} has {wanted}: nothing to run")
    maestro = ctx.maestro or find_maestro()
    if maestro is None:
        raise MaestroLocalError(NOT_READY, "maestro not found: run doctor")
    if dev.xcode is not None and not ctx.fold_xcode.is_dir():
        raise MaestroLocalError(NOT_READY, f"{dev.name} needs Xcode at {ctx.fold_xcode}, which is not installed")
    sim = one_device(list_devices(ctx), dev.name)
    if sim is None:
        raise MaestroLocalError(NOT_READY, f"{dev.name} is not made: run setup-pool, then build")
    if sim.state != "Booted":
        raise MaestroLocalError(NOT_READY, f"{dev.name} {sim.udid} is {sim.state}, not booted: run build (it boots the pool)")
    fd = acquire_lock(ctx.lock_dir, sim.udid)
    try:
        res = ctx.simctl("get_app_container", sim.udid, APP_ID, xcode=ctx.device_xcode(dev))
        if res.code != 0:
            raise MaestroLocalError(NOT_READY, f"{APP_ID} is not installed on {dev.name}: run build")
        stamp = time.strftime("%Y%m%d-%H%M%S")
        out_dir = ctx.repo / "qa-output/maestro" / f"{stamp}-{dev.name}"
        out_dir.mkdir(parents=True, exist_ok=True)
        argv = maestro_argv(maestro, sim.udid, chosen, out_dir, args)
        env = {**os.environ, **app_env(args)}
        ctx.say(f"run     {dev.name} {sim.udid}: {len(chosen)} flows tagged {dev.tag}" + (f" and {' or '.join(include)}" if include else ""))
        for path in chosen:
            ctx.say(f"flow    {path.relative_to(ctx.repo) if path.is_relative_to(ctx.repo) else path}")
        res = ctx.run(argv, args.timeout, env=env, capture=False, cwd=ctx.repo, xcode=ctx.device_xcode(dev))
        report = out_dir / "report.xml"
        ctx.say(f"report  {report}" + ("" if report.exists() else " (not written)"))
        ctx.say(f"maestro exit {res.code}")
        return res.code
    finally:
        os.close(fd)


# ---------------------------------------------------------------------------------------------------------------
# check-syntax


@dataclass
class Problem:
    path: str
    message: str

    def __str__(self) -> str:
        return f"{self.path}: {self.message}"


SEPARATOR = re.compile(r"^---\s*$")
ID_LINE = re.compile(r"(?<![\w.$-])id:\s*(\"([^\"]*)\"|'([^']*)'|([^\s,}#]+))")
TEST_ID_DECL = re.compile(r'static\s+let\s+\w+\s*=\s*"(mp\.[^"]+)"')
REGEX_CHARS = set("*+?[]()|\\^$")


def load_test_ids(path: Path) -> set[str]:
    if not path.is_file():
        raise MaestroLocalError(FAIL, f"cannot read the selector dictionary {path}: the check fails closed")
    ids = set(TEST_ID_DECL.findall(path.read_text()))
    if not ids:
        raise MaestroLocalError(FAIL, f"no mp.* ids found in {path}: the check fails closed")
    return ids


def meaningful(lines: list[str]) -> list[tuple[int, str]]:
    return [(n, line) for n, line in lines if line.strip() and not line.lstrip().startswith("#")]


def split_documents(text: str) -> list[list[tuple[int, str]]]:
    docs: list[list[tuple[int, str]]] = [[]]
    for number, line in enumerate(text.splitlines(), 1):
        if SEPARATOR.match(line):
            docs.append([])
        else:
            docs[-1].append((number, line))
    return docs


def is_workspace_config(path: Path, docs: list[list[tuple[int, str]]]) -> bool:
    if path.name not in ("config.yaml", "config.yml") or len(docs) != 1:
        return False
    return not any(line.startswith("appId:") or line.startswith("- ") for _, line in meaningful(docs[0]))


def check_flow(path: Path, rel: str, ids: set[str]) -> tuple[list[Problem], list[str]]:
    problems: list[Problem] = []
    notes: list[str] = []
    try:
        text = path.read_text()
    except (OSError, UnicodeDecodeError) as exc:
        return [Problem(rel, f"cannot read: {exc}")], notes
    docs = split_documents(text)
    # A leading `---` makes an empty first document; a file that is only commands has no header.
    if len(docs) == 1:
        if "subflows" in Path(rel).parts:
            header, commands = [], docs[0]
        else:
            return [Problem(rel, "no appId header document: a flow is `appId: ${APP_ID}`, `---`, then its commands")], notes
    elif len(docs) == 2:
        header, commands = docs
    else:
        return [Problem(rel, f"{len(docs)} YAML documents: a flow is one header document and one commands list")], notes

    head = meaningful(header)
    if head or "subflows" not in Path(rel).parts:
        app_lines = [line for _, line in head if line.startswith("appId:")]
        if not app_lines:
            problems.append(Problem(rel, "the header document has no appId"))
        else:
            value = app_lines[0].split(":", 1)[1].split(" #", 1)[0].strip().strip("\"'")
            if value not in FLOW_APP_IDS and not (value.startswith("${") and "APP_ID" in value):
                problems.append(Problem(rel, f"appId is {value!r}: use ${{APP_ID}} (or {APP_ID})"))

    body = meaningful(commands)
    if not body:
        problems.append(Problem(rel, "the commands list is empty"))
    for number, line in body:
        if not line.startswith(" ") and not line.startswith("-"):
            problems.append(Problem(f"{rel}:{number}", "commands are not a YAML list (each top-level line starts `- `)"))
            break

    for number, line in header + commands:
        if line.lstrip().startswith("#"):
            continue
        for match in ID_LINE.finditer(line):
            value = next(g for g in match.groups()[1:] if g is not None)
            where = f"{rel}:{number}"
            if "${" in value:
                notes.append(f"{where}: id {value!r} is a variable; its value is not checked")
            elif value in ids:
                continue
            elif not value.startswith("mp."):
                problems.append(Problem(where, f"id {value!r} is not an mp.* id: select by id only with an id from {TEST_IDS}"))
            elif REGEX_CHARS & set(value):
                try:
                    pattern = re.compile(value)
                except re.error:
                    problems.append(Problem(where, f"id {value!r} is not a valid pattern"))
                    continue
                if not any(pattern.fullmatch(i) for i in ids):
                    problems.append(Problem(where, f"id pattern {value!r} matches no id in {TEST_IDS}"))
            else:
                problems.append(Problem(where, f"id {value!r} is not in {TEST_IDS}"))
    return problems, notes


def cmd_check_syntax(args: argparse.Namespace, ctx: Ctx) -> int:
    root = (ctx.repo / args.flows).resolve()
    if not root.is_dir():
        raise MaestroLocalError(FAIL, f"no flows folder at {root}: the check fails closed")
    ids = load_test_ids(ctx.repo / args.test_ids)
    files = sorted(p for p in root.rglob("*") if p.is_file() and p.suffix in (".yaml", ".yml"))
    maestro = None
    if not args.no_maestro:
        maestro = ctx.maestro or find_maestro()
        if maestro is None:
            raise MaestroLocalError(NOT_READY, "maestro not found; --no-maestro runs the structural check only")
    problems: list[Problem] = []
    notes: list[str] = []
    checked = 0
    for path in files:
        rel = str(path.relative_to(root))
        if is_workspace_config(path, split_documents(path.read_text(errors="replace"))):
            notes.append(f"{rel}: workspace config, not a flow")
            continue
        checked += 1
        found, said = check_flow(path, rel, ids)
        problems += found
        notes += said
        if maestro is not None:
            res = ctx.run([maestro, "check-syntax", str(path)], T_QUICK * 2)
            if res.code != 0:
                problems.append(Problem(rel, f"maestro check-syntax: {tail(res.out + res.err, 3)}"))
    if checked == 0:
        raise MaestroLocalError(FAIL, f"no flows under {root}: the check fails closed")
    for note in notes:
        ctx.say(f"note    {note}")
    for problem in problems:
        ctx.say(f"FAIL    {problem}")
    ctx.say(f"{checked} flows, {len(problems)} problems" + ("" if maestro else " (structural check only)"))
    return FAIL if problems else OK


# ---------------------------------------------------------------------------------------------------------------
# The hidden lock probe, for the selftest's second process


def cmd_try_lock(args: argparse.Namespace, ctx: Ctx) -> int:
    fd = acquire_lock(ctx.lock_dir, args.udid)
    os.close(fd)
    ctx.say("locked")
    return OK


# ---------------------------------------------------------------------------------------------------------------
# selftest


GOOD_FLOW = """appId: '${typeof APP_ID !== "undefined" && APP_ID ? APP_ID : "com.mypaisapp.agent.dev"}'
name: MA-273 AC1: the tab bar opens Home
tags:
  - smoke
  - iphone
  - ipad
---
- launchApp:
    clearState: true
- tapOn:
    id: "mp.tab.home"
- assertVisible: { id: mp.home.hero }
- tapOn:
    id: "mp.forecast.*"
"""

TEST_IDS_FIXTURE = """public enum TestIDs {
  public static let tabHome = "mp.tab.home"
  public static let homeHero = "mp.home.hero"
  public static let forecastYear = "mp.forecast.year"
}
"""

BAD_FLOWS = {
    "no appId header document": "- launchApp\n- tapOn:\n    id: mp.tab.home\n",
    "the header document has no appId": "name: x\n---\n- launchApp\n",
    "appId is 'com.example'": "appId: com.example\n---\n- launchApp\n",
    "commands are not a YAML list": "appId: ${APP_ID}\n---\nlaunchApp: true\n",
    "is not in ios/MyPaisaCore/Testing/TestIDs.swift": "appId: ${APP_ID}\n---\n- tapOn:\n    id: mp.tab.nope\n",
    "is not an mp.* id": "appId: ${APP_ID}\n---\n- tapOn:\n    id: \"send_button\"\n",
    "matches no id": "appId: ${APP_ID}\n---\n- tapOn:\n    id: \"mp.nothing.*\"\n",
    "3 YAML documents": "appId: ${APP_ID}\n---\n- launchApp\n---\n- back\n",
}


def fake_simctl(devices: dict[str, tuple[str, str]], installed: bool = True) -> tuple[Runner, list[list[str]]]:
    """A runner that answers simctl from a table of name -> (udid, state) and records every call."""
    seen: list[list[str]] = []

    def runner(argv: Sequence[str], timeout: float, env: dict[str, str] | None = None, **_: object) -> Result:
        argv = list(argv)
        seen.append(argv)
        if argv[:4] == ["xcrun", "simctl", "list", "devices"]:
            listing = [{"name": n, "udid": u, "state": s, "isAvailable": True} for n, (u, s) in devices.items()]
            return Result(0, json.dumps({"devices": {runtime_id("26.5"): listing}}))
        if argv[:4] == ["xcrun", "simctl", "list", "devicetypes"]:
            names = {d.device_type for d in ALL_DEVICES}
            return Result(0, json.dumps({"devicetypes": [{"name": n, "identifier": "type." + n} for n in names]}))
        if argv[:4] == ["xcrun", "simctl", "list", "runtimes"]:
            rts = [{"identifier": runtime_id(v), "isAvailable": True} for v in ("26.5", FOLD_OS)]
            return Result(0, json.dumps({"runtimes": rts}))
        if argv[:3] == ["xcrun", "simctl", "create"]:
            return Result(0, f"NEW-{argv[3]}\n")
        if argv[:3] == ["xcrun", "simctl", "get_app_container"]:
            return Result(0 if installed else 2, "", "" if installed else "No such app")
        if argv[:2] == ["xcrun", "simctl"]:
            return Result(0)
        if argv[0] == "xcodebuild":
            return Result(0)
        if "test" in argv:  # maestro
            runner.maestro_env = env  # type: ignore[attr-defined]
            return Result(7)
        return Result(0)

    return runner, seen


def cmd_selftest(args: argparse.Namespace, ctx: Ctx) -> int:
    results: list[tuple[str, bool, str]] = []

    def case(name: str, passed: bool, detail: str = "") -> None:
        results.append((name, passed, detail))

    def call(argv: list[str], c: Ctx) -> tuple[int, str]:
        lines: list[str] = []
        c.out = lines.append
        code = main(argv, c, err=lines.append)
        return code, "\n".join(lines)

    with tempfile.TemporaryDirectory(prefix="maestro-selftest-") as tmp:
        base = Path(tmp)
        repo = base / "repo"
        (repo / "ios/MyPaisaCore/Testing").mkdir(parents=True)
        (repo / TEST_IDS).write_text(TEST_IDS_FIXTURE)
        flows = repo / ".maestro/flows"
        flows.mkdir(parents=True)
        (flows / "home.yaml").write_text(GOOD_FLOW)
        (repo / ".maestro/subflows").mkdir()
        (repo / ".maestro/subflows/open-home.yaml").write_text("- tapOn:\n    id: mp.tab.home\n")
        (flows / "ipad_only.yaml").write_text("appId: ${APP_ID}\ntags: [regression, ipad]\n---\n- launchApp\n")
        (flows / "iphone_slow.yaml").write_text("appId: ${APP_ID}\ntags:\n  - regression\n  - iphone\n  - slow\n---\n- launchApp\n")
        (flows / "no_device.yaml").write_text("appId: ${APP_ID}\ntags:\n  - smoke\n---\n- launchApp\n")
        (repo / ".maestro/config.yaml").write_text("flows:\n  - flows/*\n")
        lock_dir = base / "locks"
        no_fold = base / "no-such-xcode.app"

        def new_ctx(runner: Runner = run_cmd) -> Ctx:
            return Ctx(runner=runner, repo=repo, lock_dir=lock_dir, fold_xcode=no_fold, maestro="/fake/maestro")

        # 1. Argument parsing.
        code, _ = call(["run"], new_ctx())
        case("run without --device is a usage error (exit 2)", code == USAGE, f"exit {code}")
        code, _ = call(["run", "--device", "MP-QA-iPhone", "--width", "wide"], new_ctx())
        case("run --width that is not a number is a usage error (exit 2)", code == USAGE, f"exit {code}")
        tags = split_tags(["smoke,@regression", " ios "])
        case("--tags splits commas and drops a leading @", tags == ["smoke", "regression", "ios"], str(tags))

        # 2. MP-Interactive is refused before any command runs.
        def must_not_run(argv: Sequence[str], timeout: float, **_: object) -> Result:
            raise AssertionError(f"ran {argv}")

        code, text = call(["run", "--device", "MP-Interactive"], new_ctx(must_not_run))
        case("run refuses MP-Interactive (exit 2, no command run)", code == USAGE and "Maestro MCP" in text, f"exit {code}: {text[-120:]}")
        code, text = call(["run", "--device", "MP-QA-Nope"], new_ctx(must_not_run))
        case("run refuses an unknown device (exit 2)", code == USAGE and "unknown device" in text, f"exit {code}")

        # 3. A device that is not booted, or has no app, is refused.
        runner, _ = fake_simctl({"MP-QA-iPhone": ("U-IPHONE", "Shutdown")})
        code, text = call(["run", "--device", "MP-QA-iPhone"], new_ctx(runner))
        case("run refuses a device that is not booted (exit 3)", code == NOT_READY and "not booted" in text, f"exit {code}: {text[-120:]}")
        runner, _ = fake_simctl({"MP-QA-iPhone": ("U-IPHONE", "Booted")}, installed=False)
        code, text = call(["run", "--device", "MP-QA-iPhone"], new_ctx(runner))
        case("run refuses a device without the app (exit 3)", code == NOT_READY and "not installed" in text, f"exit {code}: {text[-120:]}")

        # 4. The command, the app's environment, and Maestro's exit status passed through.
        runner, seen = fake_simctl({"MP-QA-iPhone": ("U-IPHONE", "Booted")})
        code, text = call(["run", "--device", "MP-QA-iPhone", "--tags", "smoke", "--exclude-tags", "slow", "--width", "744"], new_ctx(runner))
        mcall = next((a for a in seen if a and a[0] == "/fake/maestro"), [])
        env = getattr(runner, "maestro_env", None) or {}
        want = ["--device", "U-IPHONE", "test", str((flows / "home.yaml").resolve()), "--format", "JUNIT",
                "-e", f"APP_ID={APP_ID}", f"API_URL={DEFAULT_API_URL}", "VIEWPORT_WIDTH=744", "--test-output-dir"]
        case("run passes maestro's exit status through (7)", code == 7, f"exit {code}")
        case("run builds the maestro command from the contract", all(w in mcall for w in want), " ".join(mcall))
        case("run passes no --include-tags or --exclude-tags (it chose the files)",
             "--include-tags" not in mcall and "--exclude-tags" not in mcall, " ".join(mcall))
        case("run hands the app no MYPAISA_AUTH_STUB", not any("AUTH_STUB" in k for k in env) and not any("AUTH_STUB" in a for a in mcall), "")
        out_arg = mcall[mcall.index("--output") + 1] if "--output" in mcall else ""
        case("run writes JUnit under qa-output/maestro/<ts>-<device>/report.xml",
             re.search(r"qa-output/maestro/\d{8}-\d{6}-MP-QA-iPhone/report\.xml$", out_arg) is not None, out_arg)
        case("run hands the app MYPAISA_* through SIMCTL_CHILD_",
             env.get("SIMCTL_CHILD_MYPAISA_API_URL") == DEFAULT_API_URL and env.get("SIMCTL_CHILD_MYPAISA_STATIC_MOTION") == "1"
             and env.get("SIMCTL_CHILD_MYPAISA_VIEWPORT_WIDTH") == "744", str({k: v for k, v in env.items() if k.startswith("SIMCTL")}))
        case("run never calls a destructive simctl verb", not any(a[:3] in (["xcrun", "simctl", v] for v in ("erase", "delete", "shutdown")) for a in seen), "")

        # 4b. Flow selection: the device's own tag AND one of --tags AND none of --exclude-tags.
        def picked(device_tag: str, include: list[str], exclude: list[str]) -> list[str]:
            return [p.name for p in select_flows(flows, device_tag, include, exclude)]

        got = picked("iphone", ["smoke"], [])
        case("iPhone --tags smoke runs only flows tagged smoke AND iphone", got == ["home.yaml"], str(got))
        got = picked("ipad", [], [])
        case("iPad with no --tags runs every flow tagged ipad (block and inline tags)", got == ["home.yaml", "ipad_only.yaml"], str(got))
        got = picked("iphone", [], ["slow"])
        case("--exclude-tags drops a flow that has the tag", got == ["home.yaml"], str(got))
        got = picked("foldable", ["smoke"], [])
        case("a flow without the device's tag never runs there (foldable: none)", got == [], str(got))
        got = picked("iphone", ["smoke", "regression"], [])
        case("several --tags are an OR, still ANDed with the device tag", got == ["home.yaml", "iphone_slow.yaml"], str(got))
        runner, seen = fake_simctl({"MP-QA-Fold": ("U-FOLD", "Booted")})
        c = new_ctx(runner)
        c.fold_xcode = base
        code, text = call(["run", "--device", "MP-QA-Fold", "--tags", "smoke"], c)
        case("run with no matching flow fails (exit 1) and runs no maestro",
             code == FAIL and "nothing to run" in text and not any(a and a[0] == "/fake/maestro" for a in seen), f"exit {code}: {text[-120:]}")

        # 5. The lock: a second process cannot take a held lock, and can once it is let go.
        probe = [sys.executable, "-I", str(Path(__file__).resolve()), "_try-lock", "--udid", "U-LOCK"]
        probe_env = {**os.environ, "MP_MAESTRO_LOCK_DIR": str(lock_dir)}
        fd = acquire_lock(lock_dir, "U-LOCK")
        try:
            held = run_cmd(probe, 30, env=probe_env)
        finally:
            os.close(fd)
        freed = run_cmd(probe, 30, env=probe_env)
        case("a second process is refused a held lock (exit 4)", held.code == BUSY and "in use" in held.err, f"exit {held.code}: {held.err.strip()[-120:]}")
        case("the lock is free again once let go (exit 0)", freed.code == OK, f"exit {freed.code}: {freed.err.strip()[-120:]}")
        runner, _ = fake_simctl({"MP-QA-iPhone": ("U-HELD", "Booted")})
        fd = acquire_lock(lock_dir, "U-HELD")
        try:
            code, text = call(["run", "--device", "MP-QA-iPhone"], new_ctx(runner))
        finally:
            os.close(fd)
        case("run refuses a device another run holds (exit 4)", code == BUSY, f"exit {code}: {text[-120:]}")

        # 6. check-syntax: the good flows pass; each planted fault is refused for its own reason.
        code, text = call(["check-syntax", "--no-maestro"], new_ctx())
        case("check-syntax passes good flows, a subflow and the workspace config (exit 0)", code == OK and "5 flows, 0 problems" in text, text[-200:])
        for expected, body in BAD_FLOWS.items():
            bad = repo / ".maestro/flows/planted.yaml"
            bad.write_text(body)
            code, text = call(["check-syntax", "--no-maestro"], new_ctx())
            bad.unlink()
            case(f"check-syntax refuses a flow: {expected}", code == FAIL and expected in text, f"exit {code}: {text[-160:]}")
        empty = base / "empty"
        (empty / ".maestro").mkdir(parents=True)
        (empty / "ios/MyPaisaCore/Testing").mkdir(parents=True)
        (empty / TEST_IDS).write_text(TEST_IDS_FIXTURE)
        c = new_ctx()
        c.repo = empty
        code, text = call(["check-syntax", "--no-maestro"], c)
        case("check-syntax fails closed on a folder with no flows", code == FAIL and "no flows" in text, f"exit {code}: {text[-120:]}")
        ids_file = repo / TEST_IDS
        ids_file.write_text("public enum TestIDs {}\n")
        code, text = call(["check-syntax", "--no-maestro"], new_ctx())
        case("check-syntax fails closed on a dictionary with no mp.* ids", code == FAIL and "no mp.* ids" in text, f"exit {code}: {text[-120:]}")
        ids_file.unlink()
        code, text = call(["check-syntax", "--no-maestro"], new_ctx())
        case("check-syntax fails closed when TestIDs.swift is missing", code == FAIL and "cannot read" in text, f"exit {code}: {text[-120:]}")
        ids_file.write_text(TEST_IDS_FIXTURE)

        # 7. A command that runs over its limit is stopped and reported (exit 124).
        try:
            run_cmd(["/bin/sleep", "5"], 0.5)
            case("a command over its limit is stopped (exit 124)", False, "no timeout raised")
        except MaestroLocalError as exc:
            case("a command over its limit is stopped (exit 124)", exc.code == TIMEOUT, str(exc))

        # 8. setup-pool makes only what is missing, never deletes, and skips the fold without Xcode 27.1.
        runner, seen = fake_simctl({"MP-QA-iPhone": ("U-IPHONE", "Shutdown")})
        code, text = call(["setup-pool"], new_ctx(runner))
        created = [a[3] for a in seen if a[:3] == ["xcrun", "simctl", "create"]]
        case("setup-pool creates only the missing devices", code == OK and created == ["MP-QA-iPad", "MP-Interactive"], f"exit {code}: {created}")
        case("setup-pool skips MP-QA-Fold without Xcode 27.1, saying so", "skip    MP-QA-Fold" in text, text[-200:])
        case("setup-pool never deletes or erases", not any(a[2:3] in (["delete"], ["erase"]) for a in seen if a[:2] == ["xcrun", "simctl"]), "")
        runner, seen = fake_simctl({d.name: (f"U-{i}", "Booted") for i, d in enumerate(ALL_DEVICES)})
        fold = base / "Xcode-27.1-beta.app"
        fold.mkdir()
        c = new_ctx(runner)
        c.fold_xcode = fold
        code, text = call(["setup-pool"], c)
        case("setup-pool is idempotent: nothing created when all exist", code == OK and not any(a[2:3] == ["create"] for a in seen), text[-200:])

        # 9. build installs on the pool and never touches MP-Interactive unless asked.
        app = repo / DEFAULT_DERIVED / "Build/Products/Debug-iphonesimulator" / APP_NAME
        app.mkdir(parents=True)
        udids = {d.name: (f"U-{d.name}", "Shutdown") for d in ALL_DEVICES}
        runner, seen = fake_simctl(udids)
        code, text = call(["build"], new_ctx(runner))
        touched = [a for a in seen if "U-MP-Interactive" in a]
        installs = [a[3] for a in seen if a[:3] == ["xcrun", "simctl", "install"]]
        build = next((a for a in seen if a and a[0] == "xcodebuild"), [])
        case("build runs xcodebuild for MyPaisa Dev, Debug, generic simulator, unsigned",
             all(x in build for x in ["-scheme", SCHEME, "-configuration", "Debug", "generic/platform=iOS Simulator", "CODE_SIGNING_ALLOWED=NO"]), " ".join(build))
        case("build boots and installs on the pool only", code == OK and installs == ["U-MP-QA-iPhone", "U-MP-QA-iPad"] and not touched, f"exit {code}: {installs}, touched {len(touched)}")
        runner, seen = fake_simctl(udids)
        code, text = call(["build", "--no-build", "--include-interactive"], new_ctx(runner))
        installs = [a[3] for a in seen if a[:3] == ["xcrun", "simctl", "install"]]
        case("build --include-interactive installs on MP-Interactive too", code == OK and "U-MP-Interactive" in installs, str(installs))
        case("build --no-build runs no xcodebuild", not any(a and a[0] == "xcodebuild" for a in seen), "")
        case("build --no-build runs no spm update", not any(a and a[0].endswith(RN_CLI) for a in seen), "")

        # 9b. build runs React Native's Swift package step first, in ios/, and fails closed without it.
        def spm_runner(spm_code: int | None) -> tuple[Runner, list[tuple[list[str], object]]]:
            inner, _ = fake_simctl(udids)
            order: list[tuple[list[str], object]] = []

            def runner(argv: Sequence[str], timeout: float, **kw: object) -> Result:
                order.append((list(argv), kw.get("cwd")))
                if argv and str(argv[0]).endswith(RN_CLI):
                    if spm_code is None:
                        raise MaestroLocalError(NOT_READY, f"{argv[0]} not found: No such file or directory")
                    return Result(spm_code, "", "spm said no" if spm_code else "")
                return inner(argv, timeout, **kw)

            return runner, order

        runner, order = spm_runner(0)
        code, text = call(["build"], new_ctx(runner))
        firsts = [a[0] for a, _ in order]
        spm_at = next((i for i, a in enumerate(firsts) if a.endswith(RN_CLI)), -1)
        build_at = firsts.index("xcodebuild") if "xcodebuild" in firsts else -1
        spm_call = order[spm_at] if spm_at >= 0 else ([], None)
        case("build runs react-native spm update --yes in ios/ before xcodebuild",
             code == OK and 0 <= spm_at < build_at and spm_call[0][1:] == ["spm", "update", "--yes"]
             and spm_call[1] == repo / "ios", f"exit {code}: {order[:3]}")
        runner, order = spm_runner(1)
        code, text = call(["build"], new_ctx(runner))
        case("build fails closed when spm update fails (exit 1, no xcodebuild, no install)",
             code == FAIL and "spm update failed" in text and not any(a[0] == "xcodebuild" or a[:3] == ["xcrun", "simctl", "install"] for a, _ in order),
             f"exit {code}: {text[-160:]}")
        runner, order = spm_runner(None)
        code, text = call(["build"], new_ctx(runner))
        case("build fails closed when the React Native CLI is missing (exit 3, says to install)",
             code == NOT_READY and "pnpm" in text and not any(a[0] == "xcodebuild" for a, _ in order), f"exit {code}: {text[-160:]}")

    failed = [r for r in results if not r[1]]
    for name, passed, detail in results:
        ctx.say(f"{'ok  ' if passed else 'FAIL'}  {name}" + ("" if passed else f"\n        got: {detail}"))
    ctx.say(f"{len(results) - len(failed)}/{len(results)} cases passed")
    return FAIL if failed else OK


# ---------------------------------------------------------------------------------------------------------------
# The command line


class Parser(argparse.ArgumentParser):
    def error(self, message: str) -> None:  # usage errors: exit 2, one line, no traceback
        raise MaestroLocalError(USAGE, f"{self.prog}: {message}")


def positive_int(value: str) -> int:
    try:
        number = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError(f"{value!r} is not a whole number of points") from None
    if number <= 0:
        raise argparse.ArgumentTypeError(f"{value} must be above 0")
    return number


def build_parser() -> Parser:
    parser = Parser(prog="maestro_local.py", description=__doc__.split("\n\n", 2)[1] if __doc__ else None,
                    formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True, parser_class=Parser)

    p = sub.add_parser("doctor", help="read only: the tools, the pool, MP-Interactive, .maestro/ and Xcode 27.1")
    p.add_argument("--os", default=DEFAULT_OS, help=f"the iOS runtime the pool uses (default {DEFAULT_OS})")
    p.add_argument("--derived-data", default=DEFAULT_DERIVED, help=f"where build puts the app (default {DEFAULT_DERIVED})")
    p.set_defaults(func=cmd_doctor)

    p = sub.add_parser("setup-pool", help="create any missing MP-QA-* and MP-Interactive simulator; never deletes or erases")
    p.add_argument("--os", default=DEFAULT_OS, help=f"the iOS runtime for the iPhone, the iPad and MP-Interactive (default {DEFAULT_OS}); MP-QA-Fold is iOS {FOLD_OS}")
    p.set_defaults(func=cmd_setup_pool)

    p = sub.add_parser("build", help="build MyPaisa Dev (Debug) for the simulator, then boot the pool and install the app")
    p.add_argument("--derived-data", default=DEFAULT_DERIVED, help=f"xcodebuild -derivedDataPath (default {DEFAULT_DERIVED})")
    p.add_argument("--no-build", action="store_true", help="install the app already built; run no xcodebuild")
    p.add_argument("--no-bundle", action="store_true", help="leave the JavaScript to Metro (no FORCE_BUNDLING); Metro must then run")
    p.add_argument("--include-interactive", action="store_true", help="also boot MP-Interactive and install there")
    p.set_defaults(func=cmd_build)

    p = sub.add_parser("run", help="run the flows on one pool simulator, holding its lock; exits with Maestro's status")
    p.add_argument("--device", required=True, help=f"one of {', '.join(d.name for d in POOL)}")
    p.add_argument("--tags", action="append", help="run flows with any of these tags (comma separated; repeatable), on top of the device's own tag")
    p.add_argument("--exclude-tags", action="append", help="leave out flows with these tags (comma separated; repeatable)")
    p.add_argument("--width", type=positive_int, help="the window width in points (MYPAISA_VIEWPORT_WIDTH), for the iPad's width bands")
    p.add_argument("--flows", default=".maestro/flows", help="a flow file or folder (default .maestro/flows)")
    p.add_argument("--api-url", default=DEFAULT_API_URL, help=f"MYPAISA_API_URL (default the local stack, {DEFAULT_API_URL})")
    p.add_argument("--timeout", type=positive_int, default=T_RUN, help=f"hard limit for the run, in seconds (default {T_RUN})")
    p.set_defaults(func=cmd_run)

    p = sub.add_parser("check-syntax", help="lint every flow with no device: maestro check-syntax, the header, the list, and every id: against TestIDs.swift")
    p.add_argument("--flows", default=".maestro", help="the folder to check (default .maestro)")
    p.add_argument("--test-ids", default=TEST_IDS, help=f"the selector dictionary (default {TEST_IDS})")
    p.add_argument("--no-maestro", action="store_true", help="the structural check only, without maestro check-syntax")
    p.set_defaults(func=cmd_check_syntax)

    p = sub.add_parser("selftest", help="offline cases: arguments, the MP-Interactive refusal, the lock, check-syntax, the pool")
    p.set_defaults(func=cmd_selftest)

    p = sub.add_parser("_try-lock", help=argparse.SUPPRESS)
    p.add_argument("--udid", required=True)
    p.set_defaults(func=cmd_try_lock)
    return parser


def main(argv: list[str] | None = None, ctx: Ctx | None = None, err: Callable[[str], None] | None = None) -> int:
    ctx = ctx or Ctx()
    err = err or (lambda line: print(line, file=sys.stderr))
    try:
        args = build_parser().parse_args(argv)
        return args.func(args, ctx)
    except MaestroLocalError as exc:
        err(f"maestro_local: {exc}")
        return exc.code
    except SystemExit as exc:  # --help
        return exc.code if isinstance(exc.code, int) else OK
    except KeyboardInterrupt:
        err("maestro_local: interrupted")
        return 130


if __name__ == "__main__":
    sys.exit(main())
