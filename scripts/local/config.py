"""The fixed facts of the local stack. Everything binds to loopback and every AWS call goes to moto."""

from dataclasses import dataclass
from ipaddress import ip_address
from urllib.parse import urlsplit

HOST = "127.0.0.1"
API_PORT = 8787  # the port `docs/RESEARCH.md` §8.4 gives the Maestro flows
MOTO_PORT = 8788
REGION = "us-east-1"
TABLE = "mypaisa-local-core"
BUCKET = "mypaisa-local-documents"
UPDATES_QUEUE = "mypaisa-local-updates.fifo"
OUTBOX_QUEUE = "mypaisa-local-outbox.fifo"
WORK_QUEUE = "mypaisa-local-work"

# The stub's members, as `docs/RESEARCH.md` §8.4 names them for MYPAISA_AUTH_STUB.
MEMBERS = {"owner_arun": "owner", "member_asha": "member", "viewer_guest": "viewer"}


def is_loopback(host: str | None) -> bool:
    """A real loopback address, or the name for one. Anything unreadable is not loopback."""
    if host == "localhost":
        return True
    try:
        return ip_address(host or "").is_loopback
    except ValueError:
        return False


def require_loopback(endpoint: str) -> str:
    """Refuses an endpoint off this machine, so no fault here can ever reach real AWS."""
    host = urlsplit(endpoint).hostname
    if not is_loopback(host):
        message = f"the local stack talks only to this machine, not {endpoint}"
        raise ValueError(message)
    return endpoint


@dataclass(frozen=True)
class Pacing:
    """How the stream behaves (ARCHITECTURE §19.5). Tests shorten the waits."""

    active_poll_s: float = 0.2
    idle_poll_s: float = 1.0
    heartbeat_s: float = 15.0
    max_stream_s: float = 14 * 60.0
    delta_flush_s: float = 0.2
