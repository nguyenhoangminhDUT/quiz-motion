# Database foundation

PostgreSQL 18.6 runs through root docker-compose.yml. The named volume
action-quiz_postgres_data persists across stops. Only loopback is published;
default host port is **55432**, selected because 5432 was already allocated locally.
The official PostgreSQL 18 image stores versioned data under /var/lib/postgresql,
so the volume is mounted there rather than the pre-18 data path.

## Local setup (PowerShell or a normal terminal)

Prerequisites: running Docker Desktop/Engine, Python 3.12+ and uv.

```sh
uv sync --directory apps/api --frozen
docker compose up -d --wait postgres
uv run --directory apps/api --frozen alembic upgrade head
uv run --directory apps/api --frozen alembic current
uv run --directory apps/api --frozen python ../../scripts/check-database.py
```

The read-only helper executes SELECT 1 and reads alembic_version.
Stop without deleting data: docker compose stop postgres (or npm run db:down).
Do not use down -v unless the owner explicitly intends to delete local database data.

No .env is required for development defaults. Optional root .env customizes
POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD and POSTGRES_PORT. The local API DATABASE_URL
must match them; arbitrary reserved password characters must be URL-encoded.
Examples use local development credentials only, never production credentials.

Root example URL:
postgresql+asyncpg://action_quiz:action_quiz_dev_only@localhost:55432/action_quiz.
A backend running in Compose uses postgres:5432 instead. The container's internal
port remains 5432; never use the container hostname as the local host default.

Changing credentials after a volume is initialized does not recreate PostgreSQL users.
Use an intentional role/password migration or a separately named development volume;
do not delete existing volumes as a routine configuration fix.

## SQLAlchemy resources and transactions

main.create_app wires one Database instance during FastAPI lifespan. Engine creation
does not connect, so health works when PostgreSQL is down. Pool size=5, overflow=5,
pre-ping enabled, pool/connect/readiness timeouts bounded. Lifespan disposes the engine.

Database.session uses AsyncSession and a transaction context. It commits on success,
rolls back on failure/cancellation and closes at scope exit. get_session is an async
generator dependency; future write endpoints should use Depends(get_session,
scope="function") so commit errors occur before the response is sent.
Do not share a session across concurrent tasks, call synchronous sessions from async
routes, or manually manage transactions in UI/presentation code.

Base metadata uses stable constraint naming. Future ORM models belong under persistence;
pure domain entities and repository protocols stay independent of SQLAlchemy.

## Migrations

There is one empty baseline, 0001_baseline. Alembic manages its version table; there are
**no Quiz business tables**. API startup never calls create_all or applies migrations.

```sh
uv run --directory apps/api --frozen alembic revision --autogenerate -m "describe change"
uv run --directory apps/api --frozen alembic upgrade head
uv run --directory apps/api --frozen alembic current
uv run --directory apps/api --frozen alembic history
```

Review generated migrations before applying them. env.py reads validated settings,
uses asyncpg/NullPool online and Base.metadata for autogeneration, with engine cleanup
in finally. Import future model modules into metadata registration when added.
Offline SQL generation is supported with alembic upgrade head --sql.

## Dedicated integration database

Default pytest excludes integration tests. They require TEST_DATABASE_URL and reject
names without the _test suffix. The test itself performs read-only checks; migration
setup and rollback testing must target a disposable test database explicitly.

PowerShell example from root, using only the project container:

```powershell
docker compose exec -T postgres createdb -U action_quiz action_quiz_test
$env:TEST_DATABASE_URL = 'postgresql+asyncpg://action_quiz:action_quiz_dev_only@localhost:55432/action_quiz_test'
$env:DATABASE_URL = $env:TEST_DATABASE_URL
uv run --directory apps/api --frozen alembic upgrade head
uv run --directory apps/api --frozen pytest -m integration
uv run --directory apps/api --frozen alembic downgrade base
uv run --directory apps/api --frozen alembic upgrade head
Remove-Item Env:DATABASE_URL, Env:TEST_DATABASE_URL
```

createdb is a one-time operation; an existing test database need not be recreated.
Never point migration/downgrade verification at development or production data.
CI provisions an isolated PostgreSQL service with test-only credentials and waits for health.

## Optional containerized API

```sh
docker compose --profile api up -d --build api
docker compose exec -T api .venv/bin/alembic upgrade head
```

Run migrations intentionally; containers do not apply them automatically.
Dockerfile uses Python 3.12, locked uv dependencies and a non-root user.
API binds container port 8000, published on loopback API_PORT (default 8000).
If Docker port 8000 is occupied, use PowerShell $env:API_PORT='18000' before compose,
then use http://localhost:18000 and set NEXT_PUBLIC_API_URL accordingly.
Do not run local and Docker API on the same host port. Next remains local.

PostgreSQL support/image layout was checked against official
[version policy](https://www.postgresql.org/support/versioning/) and
[image documentation](https://hub.docker.com/_/postgres).
