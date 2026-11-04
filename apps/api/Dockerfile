FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:0.10.2 /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1
WORKDIR /app
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
RUN uv sync --frozen --no-dev && useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin appuser
USER appuser
EXPOSE 8000
CMD [".venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

