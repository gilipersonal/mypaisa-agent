#!/usr/bin/env python3
# pyright: basic, reportTypedDictNotRequiredAccess=false
"""Starts the local stack (MA-198): moto, then the app on loopback.

uv run --directory backend python ../scripts/local/run.py                 # the scripted agent: no key, no spend
uv run --directory backend python ../scripts/local/run.py --agent claude  # Claude on dev's key, which costs money
"""

import argparse
import sys
from pathlib import Path

import boto3
import uvicorn

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from local import aws, config
from local.agents import Agent, ClaudeAgent, ScriptedAgent
from local.app import create_local_app

DEV_KEY_PARAMETER = (
    "/mypaisa-agent/dev/anthropic/api_key"  # read at run time, never printed or stored (ARCHITECTURE §13)
)


def build_agent(name: str) -> Agent:
    if name == "scripted":
        return ScriptedAgent()
    from anthropic import AsyncAnthropic  # noqa: PLC0415 - only this mode needs the SDK at run time

    ssm = boto3.client("ssm", region_name=config.REGION)
    key = ssm.get_parameter(Name=DEV_KEY_PARAMETER, WithDecryption=True)["Parameter"]["Value"]
    return ClaudeAgent(AsyncAnthropic(api_key=key))


def main() -> None:
    parser = argparse.ArgumentParser(description="The whole app on the laptop.")
    parser.add_argument("--agent", choices=["scripted", "claude"], default="scripted")
    parser.add_argument("--port", type=int, default=config.API_PORT)
    parser.add_argument("--moto-port", type=int, default=config.MOTO_PORT)
    args = parser.parse_args()
    moto = aws.start_moto(args.moto_port)
    try:
        stack = aws.connect(f"http://{config.HOST}:{args.moto_port}")
        app = create_local_app(stack, build_agent(args.agent))
        print(f"local stack: http://{config.HOST}:{args.port} (agent: {args.agent}, moto on {args.moto_port})")  # noqa: T201
        uvicorn.run(app, host=config.HOST, port=args.port, log_level="warning")
    finally:
        moto.stop()


if __name__ == "__main__":
    main()
