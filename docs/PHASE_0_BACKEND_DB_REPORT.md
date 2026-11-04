# Phase 0 backend and database report

Verification date: 2026-11-04 (Asia/Bangkok).

## 1. Implementation summary

Extended the existing monorepo with a uv-managed FastAPI service, validated settings,
health/readiness endpoints, async SQLAlchemy resources/sessions, PostgreSQL Compose,
Alembic empty baseline, optional non-root API Docker image, test/lint/type tooling,
health integration in the existing development playground, CI and technical documentation.

Existing frontend features/contracts were preserved. The only feature-test adjustment
fixes React 19 test-environment initialization timing; no CV/game/experience redesign occurred.
No Git commit, push, remote branch change or deployment was performed.

## 2. Final project structure

```text
apps/api/
  app/
    core/{config,exceptions}.py
    domain/README.md
    application/readiness.py
    infrastructure/
      database.py
      dependencies.py
      persistence/base.py
    presentation/
      api/dependencies.py
      api/routers/health.py
      schemas/health.py
    main.py
    cli.py
  alembic/{env.py,script.py.mako,versions/0001_baseline.py}
  tests/{unit,api,integration}
  alembic.ini
  pyproject.toml
  uv.lock
  Dockerfile
  README.md
apps/web/shared/
  infrastructure/api-health-client.ts
  components/api-health-indicator.tsx
scripts/check-database.py
docker-compose.yml
Makefile
docs/{API_CONTRACTS,DATABASE,PHASE_0_BACKEND_DB_REPORT}.md
```

## 3. Backend architecture

create_app is the composition root. Lifespan creates one lazy Database engine/session
factory and disposes it on shutdown. Settings load root .env, optional app-local .env,
then environment overrides. Production requires explicit non-default DATABASE_URL and
nonempty CORS_ORIGINS; database values are represented with SecretStr.

GET /api/v1/health is process liveness and never queries DB.
GET /api/v1/ready calls an application use case depending on DatabaseProbe Protocol.
The infrastructure adapter runs SELECT 1; presentation maps availability to 200/503.
Pydantic validates HTTP responses. /docs and /openapi.json are available.

Error handlers return generic validation/HTTP/database/internal errors without raw
driver messages, connection strings or input values. Domain errors/repositories will
be designed with real Quiz rules; unused hierarchies/entities were not invented.
An AST test guards framework-free domain/application imports.

## 4. Database architecture

PostgreSQL 18.6, named volume, healthcheck, restart policy and loopback-only port 55432.
The host default uses localhost:55432; container API uses postgres:5432.
Port 55432 avoids the existing service on 5432. No other project's service was modified.

SQLAlchemy 2.1 asyncpg engine uses bounded pooling/timeouts and pre-ping.
Session dependency creates a transaction, commits on successful scope exit, rolls back
on errors, and closes the session. No sync sessions or engine-per-request allocation.

Alembic async env reads settings and Base.metadata, disposes its NullPool engine and
supports online/offline revisions. Baseline 0001_baseline has no business tables.
Only Alembic's version table exists. No startup create_all or automatic migration.
Upgrade, current, downgrade and re-upgrade were exercised on the dedicated test DB.

## 5. Frontend integration

A small shared infrastructure adapter requests /api/v1/health, validates with Zod,
handles timeout/schema/HTTP/network failures and supports abort on unmount.
A development-only indicator is mounted alongside the existing playground.
An absent NEXT_PUBLIC_API_URL disables its network request and leaves mocks usable.
Browser pose contracts and action-to-option mapping are not moved into Python.

The actual TypeScript adapter returned available/Action Quiz API against both local
FastAPI and the API container. Explicit browser-origin CORS headers were checked over HTTP.
Browser visual review itself remains unverified.

## 6. Environment setup

From root in PowerShell (use npm.cmd if npm.ps1 is blocked):

```powershell
npm ci
uv sync --directory apps/api --frozen
docker compose up -d --wait postgres
uv run --directory apps/api --frozen alembic upgrade head
uv run --directory apps/api --frozen action-quiz-api
# Separate terminal:
npm run dev
```

Local API defaults to http://localhost:8000; docs at /docs; PostgreSQL localhost:55432.
Put only public fields, including NEXT_PUBLIC_API_URL, in apps/web/.env.local.
Root .env configures API/Compose; no existing env file was overwritten.

Optional Docker mode:
docker compose --profile api up -d --build api.
Verification used host API_PORT=18000 because Docker port 8000 was already allocated.
If Next uses another port because 3000 is occupied, add that exact origin to CORS_ORIGINS.
Do not broaden CORS to wildcard origins to handle a port conflict.

## 7. Verification results

| Command / check                      | Result       | Evidence / notes                                                      |
| ------------------------------------ | ------------ | --------------------------------------------------------------------- |
| npm ci                               | PASS         | Final root lockfile installs cleanly                                  |
| uv sync                              | PASS         | 43 locked packages resolved; dependencies installed                   |
| uv lock --check                      | PASS         | Lock matches project                                                  |
| npm run check:all                    | PASS         | Full frontend checks/build and backend checks                         |
| npm run lint / typecheck             | PASS         | ESLint 10 boundaries and TypeScript strict                            |
| npm run test                         | PASS         | 12 web + 4 contracts tests                                            |
| npm run build                        | PASS         | Next production build                                                 |
| npm run api:lint                     | PASS         | Ruff app/tests/migrations/helper                                      |
| npm run api:format:check             | PASS         | 31 Python files formatted                                             |
| npm run api:typecheck                | PASS         | Mypy strict, 20 source files                                          |
| npm run api:test                     | PASS         | 11 unit/API tests, DB-independent                                     |
| pytest -m integration                | PASS         | 1 test on action_quiz_test, 11 deselected                             |
| docker compose config                | PASS         | Compose configuration valid                                           |
| docker compose up postgres           | PASS         | Project container healthy at localhost:55432                          |
| SQLAlchemy SELECT 1                  | PASS         | Output: SELECT 1 = 1; revision = 0001_baseline                        |
| alembic upgrade/current              | PASS         | 0001_baseline (head)                                                  |
| Test-DB downgrade/re-upgrade         | PASS         | Baseline → base → baseline; development DB untouched                  |
| Live health / ready / docs / OpenAPI | PASS         | All 200 with healthy DB                                               |
| Live disconnected-DB API             | PASS         | Health 200, ready 503; generic response                               |
| TypeScript health adapter            | PASS         | available, service Action Quiz API                                    |
| CORS origin header                   | PASS         | Explicit localhost:3000 origin, no wildcard                           |
| Docker API build/start               | PASS         | Non-root Python 3.12 image; ready 200 via postgres hostname           |
| Final dev home/playground HTTP       | PASS         | 200 at port 3001, backend indicator present                           |
| npm audit --omit=dev                 | PASS         | Zero production advisories                                            |
| Hosted GitHub Actions                | NOT RUN      | Jobs added; no remote push/run                                        |
| Browser visual QA                    | NOT VERIFIED | Computer Use stopped because Chrome URL could not be validated safely |

Local Python verification used 3.13.12. The Docker image ran Python 3.12.16; CI is configured
for 3.12. An initial Docker Hub anonymous-token EOF was resolved by retrying the official
image pull. No database results are inferred from mocks.

## 8. Files changed

| Files                                                | Responsibility                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| apps/api/app/**                                      | Configuration, ports/use case, SQLAlchemy resources, HTTP routes and composition |
| apps/api/alembic/**, alembic.ini                     | Async migration environment and baseline                                         |
| apps/api/pyproject.toml, uv.lock                     | Python dependencies and quality/test configuration                               |
| apps/api/tests/**                                    | Unit, API and isolated DB integration tests                                      |
| apps/api/Dockerfile, root Compose                    | Optional API container and PostgreSQL                                            |
| shared health adapter/indicator and playground route | Minimal observable frontend connectivity                                         |
| package.json, Makefile                               | Additive backend/DB commands; original npm check remains frontend-only           |
| .github/workflows/ci.yml                             | Preserved web job; added backend and isolated PostgreSQL jobs                    |
| env/ignore files and docs                            | Safe defaults, generated-file exclusions and exact setup guidance                |

## 9. Known limitations

No question/session CRUD, submission, scoring, history, auth, workers, server inference
or Quiz schema. Readiness proves connectivity, not future schema compatibility.
OpenAPI-to-TypeScript generation is documented for future business APIs, not faked now.
No deployment, production hardening or performance benchmark is claimed.

Npm reports 12 moderate development-tool advisories; production audit is clean.
Hosted CI and browser visual QA remain unverified. Development credentials in examples
are local-only. Database test commands require an explicitly isolated *_test database.

## 10. Next development tasks

Huy: browser MediaPipe/CV adapter and classifiers, independent of API.
Dũng: camera/Canvas/audio presentation and responsive gameplay.
Bình and backend contributors: agree domain models, repository protocols and first
business migrations; then define versioned Pydantic/OpenAPI endpoints with frontend owners.
Implement randomizer/continuous hold/submission orchestration in later phases.
Add generated API type drift checks when business endpoints exist.

The foundation is ready for feature development with the documented limits.
