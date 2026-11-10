# Action Quiz

A body-powered quiz foundation. The mock game assigns four distinct actions from
an eight-action pool to four options, then requires a continuous 1500 ms pose hold
before confirming and submitting an answer.

**Current status: live camera gameplay with mock quiz data.** The `/play` screen
connects browser MediaPipe recognition to the game session, including randomized
action mapping, continuous 1500 ms holds and in-memory answer submission.
Ten mock questions provide correct/incorrect feedback and reveal the correct answer;
the camera game advances automatically after a 3-second result countdown.
The development playground and pose debug page remain available for isolated checks.
Session score totals, persistence and production Quiz API calls are TODO.

## Quick start

Prerequisites: Node.js **22.12+** (Node 24 LTS recommended), npm 10+. The frontend mock workflow needs no backend, camera, Docker or secrets.

From the repository root:

```sh
npm ci
npm run dev
```

Open http://localhost:3000 and choose **Play with camera**, or go directly to
http://localhost:3000/play. Click **Enable camera** and allow browser camera access.
Match the pose beside an answer and hold it for 1.5 seconds to submit. The game
shows whether you were correct, highlights the correct answer and advances after
3 seconds. **Next question** also allows manual skipping. The 10-question practice
set repeats after the last question. Questions and submissions use mocks; no backend, Docker, Python,
API key or separate pose process is needed. Model and WASM assets are served locally.
`npm run dev` is the only command needed after dependencies are installed.

Camera frames are processed in the browser. Camera access requires localhost or HTTPS.
The camera closes when you switch away from the tab or leave the game; enable it
again when you return. Permission, missing-camera and inference errors support retry.
Correctness is graded locally by the mock gateway. There is no persistent storage.
The compact `/play` layout shows answers in a 2×2 grid, with a smaller camera on
short screens and phones. Content can still scroll on very small screens or with
increased browser zoom.

http://localhost:3000/playground offers keyboard/button simulation without a camera.
http://localhost:3000/pose-debug is an optional recognition diagnostic, independent
of gameplay. Both diagnostic routes are development-only; `/play` also works in
production builds.
On Windows PowerShell, use **npm.cmd** if execution policy blocks npm.ps1.
No execution policy change or Bash hooks are needed.

Mock mode works without an env file. Optional: copy root .env.example to
**apps/web/.env.local**. Next reads env at the app root, not the monorepo root.
The playground accepts only NEXT_PUBLIC_POSE_PROVIDER=mock and
NEXT_PUBLIC_QUIZ_PROVIDER=mock; unimplemented providers fail explicitly there.
`/play` explicitly uses real MediaPipe input and MockQuizGateway, independent of
these playground settings. Never put secrets in public variables.

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
Next, TypeScript and React Hooks plugins directly. MediaPipe Tasks Vision runs in the browser.

```text
apps/web/
  app/                 Routes, layout and global CSS
  composition/         Concrete wiring and playground integration
  features/
    pose/              Pure domain, engine port, mock and browser MediaPipe
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
StrictMode and observable UI behavior. **UI preview** changes experience snapshots
manually without submitting. **Play game (mock)** confirms after a continuous hold
and submits to an in-memory gateway; receipt does not mean a correct answer.
Production builds disable the playground and its navigation links.

The [experience layout](apps/web/features/experience/README.md) now presents a
responsive camera placeholder, question, four answer cards and illustrated pose
instructions before the development controls. It uses the existing mock runtime;
the Canvas skeleton preview uses eight hand-authored landmark samples with mirror
and partial-body controls. Experience simulation also covers camera/tracking errors,
manual progress, confirmation/submission feedback and optional sound, without changing
the game store or making submission requests. See [Experience QA](docs/EXPERIENCE_QA.md).
The `/play` screen supplies live video and model-driven landmarks to the same
presentation components through a separate camera gameplay runtime.

Next: real-camera recognition QA, Quiz API, session score totals and performance measurement.
No FPS or inference latency has been benchmarked.

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
