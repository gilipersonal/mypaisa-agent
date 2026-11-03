# MyPaisa backend

The Python package behind both doors: FastAPI controllers, services, repositories and a pure domain, in
`src/mypaisa_agent/` (ARCHITECTURE §12.1). How the code is written is in [CLAUDE.md](CLAUDE.md).

```bash
cd backend
uv sync                                                            # the locked environment
uv run uvicorn mypaisa_agent.api.app:create_app --factory --reload # the API on localhost:8000
../scripts/backend_gates.sh                                        # every gate
```
