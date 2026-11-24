# The one image the Lambdas run, in two targets (ARCHITECTURE §3 and §17.4, MA-237):
#
#   lambda  every handler on the Lambda Python runtime: api (FastAPI on Mangum), agent, sender, worker, the authorizer
#           and the Cognito triggers. Each function names its own handler (image_config.command in infra/), so the
#           target sets none (the handlers come with MA-266 and MA-29).
#   stream  the SSE stream on the api host: FastAPI on Uvicorn behind the Lambda Web Adapter, streaming its response
#           (§19.5, MA-266, which swaps the app it serves for the stream's own).
#
# Built natively for linux/arm64 on GitHub's free ubuntu-24.04-arm runner (the repository is public), pushed to the
# one `mypaisa` ECR repository by the commit's sha, and the same digest runs in dev and then in prod (MA-237, MA-347).
#
#   docker buildx build --platform linux/arm64 --target lambda -t mypaisa:lambda .
#   docker buildx build --platform linux/arm64 --target stream -t mypaisa:stream .
#
# Every base is pinned by digest; Dependabot moves them (.github/dependabot.yml).

FROM ghcr.io/astral-sh/uv:0.12.9@sha256:8b940d3a9d65bed080436972241af2e21c84b5e8c9193f7014ed71479ee795ff AS uv
FROM public.ecr.aws/awsguru/aws-lambda-adapter:1.1.0@sha256:17cfd08eff1dfea3f6a9a1e9c65fdac80aa4919b6085e746615530f43f57d2f1 AS adapter

# --- build: the locked runtime dependencies into /opt/deps, the package into /opt/pkg ---------------------------------
FROM public.ecr.aws/lambda/python:3.14@sha256:ada43e932bb0126f892fd935622eaab1199129865d7164ae66a06bcbbd975be0 AS build
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never
WORKDIR /src

# Dependencies first, from the lock alone, so a change to the code reuses this layer. Only the runtime group: the
# dev tools never reach the image. The exported file carries the lock's hashes, and the install refuses a wheel
# that does not match them.
COPY backend/pyproject.toml backend/uv.lock backend/README.md ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv export --frozen --no-dev --no-emit-project --format requirements.txt -o /tmp/requirements.txt \
 && uv pip install --python /var/lang/bin/python3 --require-hashes --target /opt/deps -r /tmp/requirements.txt

# Then the package itself, without its dependencies (they are above, at the lock's versions). Kept apart from them
# so each target copies the two as two layers: a change to the code alone pushes a layer of a few hundred KB, and
# ECR keeps the dependencies' layer once for every image that shares it.
COPY backend/src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --python /var/lang/bin/python3 --no-deps --target /opt/pkg .

# The image fails to build if the app cannot be imported from what was installed.
RUN PYTHONPATH=/opt/pkg:/opt/deps /var/lang/bin/python3 -c "import mypaisa_agent.api.app"

# --- lambda ----------------------------------------------------------------------------------------------------------
FROM public.ecr.aws/lambda/python:3.14@sha256:ada43e932bb0126f892fd935622eaab1199129865d7164ae66a06bcbbd975be0 AS lambda
COPY --from=build /opt/deps ${LAMBDA_TASK_ROOT}
COPY --from=build /opt/pkg ${LAMBDA_TASK_ROOT}

# --- stream ----------------------------------------------------------------------------------------------------------
FROM public.ecr.aws/lambda/python:3.14@sha256:ada43e932bb0126f892fd935622eaab1199129865d7164ae66a06bcbbd975be0 AS stream
COPY --from=adapter /lambda-adapter /opt/extensions/lambda-adapter
COPY --from=build /opt/deps ${LAMBDA_TASK_ROOT}
COPY --from=build /opt/pkg ${LAMBDA_TASK_ROOT}
ENV PYTHONPATH=${LAMBDA_TASK_ROOT} \
    AWS_LWA_PORT=8080 \
    AWS_LWA_READINESS_CHECK_PATH=/v1/health \
    AWS_LWA_INVOKE_MODE=response_stream
WORKDIR ${LAMBDA_TASK_ROOT}
ENTRYPOINT ["/var/lang/bin/python3", "-m", "uvicorn"]
CMD ["--factory", "mypaisa_agent.api.app:create_app", "--host", "127.0.0.1", "--port", "8080"]
