"""The API's OpenAPI 3.1 schema, written to `backend/openapi.json` for the web app's typed client (MA-194).

    uv run python -m mypaisa_agent.api.openapi > openapi.json

`tests/api/test_openapi.py` fails while the committed file differs from what the app serves, so the doors' types can
never drift from the API.
"""

import json

from mypaisa_agent.api.app import create_app
from mypaisa_agent.core.config import Settings


def schema() -> str:
    # A fixed version and environment, so the file changes only when the API does.
    app = create_app(Settings(environment="local", version="0"))
    return json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n"


if __name__ == "__main__":  # pragma: no cover - a command, run by hand and by the web gate
    print(schema(), end="")  # noqa: T201 - the command's output is the schema
