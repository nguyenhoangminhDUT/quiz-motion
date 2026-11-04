# Action Quiz API

Phase 0 backend: liveness, database readiness, async SQLAlchemy and Alembic only.
See ../../docs/DATABASE.md and ../../docs/API_CONTRACTS.md.

From repository root:

```sh
uv sync --directory apps/api --frozen
docker compose up -d postgres
uv run --directory apps/api --frozen alembic upgrade head
uv run --directory apps/api --frozen action-quiz-api
```

Local API: http://localhost:8000. Swagger: /docs. Health: /api/v1/health.
Ready: /api/v1/ready (200 for reachable PostgreSQL, 503 otherwise).
Health does not connect to the database. App startup never runs create_all or migrations.

Settings read root .env, then apps/api/.env, then environment variables (highest priority).
Safe development defaults work without files. Production requires explicit DATABASE_URL
and CORS_ORIGINS; public client variables must never contain database credentials.

```sh
uv run --directory apps/api --frozen ruff check .
uv run --directory apps/api --frozen ruff format --check .
uv run --directory apps/api --frozen mypy
uv run --directory apps/api --frozen pytest
```

Python 3.12+ and uv required; Windows PowerShell supports these exact commands.
Domain has no invented Quiz models yet. Application readiness depends on a Protocol;
infrastructure implements it with SELECT 1. Main is the composition root.
Session dependency opens one transaction per scope: commit on success, rollback on error,
close in all cases. Consumers must not share a session across concurrent tasks.

Integration tests are opt-in and only accept TEST_DATABASE_URL with a database name
ending _test. See database documentation before running migrations/downgrades.
