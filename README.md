# Action Quiz

A body-powered quiz foundation. The future game assigns four distinct actions from
an eight-action pool to four options, then requires a continuous 1500 ms pose hold
before confirming and submitting an answer.

**Current status: Phase 0, project initialization.** Working home page, development
playground, shared contracts, ports and mock adapters, plus the backend/database
extension described below. Webcam inference, classifiers,
randomization, hold detection, scoring and production API calls are TODO.

## Quick start

Prerequisites: Node.js **22.12+** (Node 24 LTS recommended), npm 10+. The frontend mock workflow needs no backend, camera, Docker or secrets.

From the repository root:

```sh
npm ci
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/playground.
On Windows PowerShell, use **npm.cmd** if execution policy blocks npm.ps1.
No execution policy change or Bash hooks are needed.

Mock mode works without an env file. Optional: copy root .env.example to
**apps/web/.env.local**. Next reads env at the app root, not the monorepo root.
Only NEXT_PUBLIC_POSE_PROVIDER=mock and NEXT_PUBLIC_QUIZ_PROVIDER=mock are supported;
unimplemented providers fail explicitly. Never put secrets in public variables.

## Commands

| Root command         | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| npm run dev          | Next development server                                 |
| npm run build        | Production build, playground returns 404                |
| npm start            | Serve production build                                  |
| npm run lint         | ESLint including architecture boundaries                |
| npm run typecheck    | Generate Next route types, strict check both workspaces |
| npm run test         | Vitest + React Testing Library                          |
| npm run format       | Format source and docs                                  |
| npm run format:check | Verify formatting                                       |
| npm run check        | Format check, lint, types, tests and build              |

## Stack and structure

Next.js App Router, React, TypeScript strict, Tailwind CSS, Zustand, Zod, Lucide React,
Vitest and RTL. Npm workspaces share one root package-lock.json. Exact versions are
in manifests/lockfile. TypeScript 6.0.x is selected for parser compatibility; ESLint 10 uses compatible
Next, TypeScript and React Hooks plugins directly. MediaPipe is intentionally deferred until it is used.

```text
apps/web/
  app/                 Routes, layout and global CSS
  composition/         Concrete wiring and playground integration
  features/
    pose/              Pure domain, engine port, mock, MediaPipe TODO
    experience/        Viewport, overlay, instructions and progress presentation
    game/              Domain, use cases, gateway, mocks and per-instance store
  shared/              Common config and components
  tests/               RTL setup
packages/contracts/    Framework-free types, schemas and tests
docs/                  Architecture, contracts, workflow, roadmap and report
.github/               CI and pull request template
```

## Ownership

| Developer    | Owned feature                                               |
| ------------ | ----------------------------------------------------------- |
| Huy          | apps/web/features/pose/                                     |
| Dũng         | apps/web/features/experience/                               |
| Bình         | apps/web/features/game/                                     |
| Joint review | packages/contracts/, composition/, root config and lockfile |

Public feature imports use index.ts; only composition imports concrete adapters.
Experience currently needs presentation only, so there are no empty layer folders.

## Tests, status and next steps

Tests cover action IDs/metadata, invalid contracts, engine lifecycle and subscription
cleanup, quiz fixtures, arbitrary option IDs, stable mapping, keyboard/button input,
StrictMode and observable UI behavior. The mock game never confirms or submits
answers; experience feedback snapshots are changed manually in the preview.
Production builds disable the playground and its navigation links.

The [experience layout](apps/web/features/experience/README.md) now presents a
responsive camera placeholder, question, four answer cards and illustrated pose
instructions before the development controls. It uses the existing mock runtime;
the Canvas skeleton preview uses eight hand-authored landmark samples with mirror
and partial-body controls. Experience simulation also covers camera/tracking errors,
manual progress, confirmation/submission feedback and optional sound, without changing
the game store or making submission requests. See [Experience QA](docs/EXPERIENCE_QA.md).
Live video and model-driven landmarks remain future work.

Next: MediaPipe/classifiers, camera alignment, game/hold/randomizer, Quiz API, then
QA/performance. No FPS or inference latency has been benchmarked.

Read [Architecture](docs/ARCHITECTURE.md), [Contracts](docs/MODULE_CONTRACTS.md),
[Development](docs/DEVELOPMENT.md), [Roadmap](docs/ROADMAP.md),
[Contributing](CONTRIBUTING.md) and [Phase 0 report](docs/PHASE_0_REPORT.md).

## Complete Phase 0 stack: PostgreSQL + FastAPI + Next.js

The backend extension adds operational endpoints and persistence infrastructure,
without connecting mock Quiz gameplay to a business API. Python uses uv independently
of npm; apps/api/uv.lock and root package-lock.json are both version-controlled inputs.

Install Node 24 LTS, Python 3.12+ (local verification used 3.13) and uv. Start Docker.
From root, use separate terminals for the two servers:

```sh
npm ci
uv sync --directory apps/api --frozen
docker compose up -d --wait postgres
uv run --directory apps/api --frozen alembic upgrade head
uv run --directory apps/api --frozen action-quiz-api
```

Then in another terminal: npm run dev. Expected URLs:

| Component              | URL                                                                      |
| ---------------------- | ------------------------------------------------------------------------ |
| Web / playground       | http://localhost:3000 / http://localhost:3000/playground                 |
| API health / readiness | http://localhost:8000/api/v1/health / http://localhost:8000/api/v1/ready |
| API docs               | http://localhost:8000/docs                                               |
| PostgreSQL             | localhost:55432 (loopback only)                                          |

The frontend-only mock workflow still runs without Docker or Python.
To enable its health indicator, put NEXT_PUBLIC_API_URL=http://localhost:8000 in
apps/web/.env.local and restart Next. Missing API config does not break mocks.

Optional root .env controls backend/Compose; only copy public fields to the web env file.
Use the supplied development values locally, never in production.

Additional root commands: api:sync, api:dev, api:test, api:lint, api:format,
api:format:check, api:typecheck, api:check, db:up, db:down, db:migrate, db:current,
db:verify and check:all. All use npm run; Windows may require npm.cmd.
npm run check keeps frontend-only behavior. npm run check:all (or make check) checks
both stacks; it does not require a live DB. Database integration tests are opt-in.

See [API README](apps/api/README.md), [Database](docs/DATABASE.md),
[HTTP contracts](docs/API_CONTRACTS.md) and
[Backend/database report](docs/PHASE_0_BACKEND_DB_REPORT.md).
