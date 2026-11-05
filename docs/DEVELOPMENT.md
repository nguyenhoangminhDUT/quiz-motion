# Development

## Local setup

Clone this repository, cd to its root, select Node 24 LTS, run npm ci then npm run dev.
Use npm.cmd on PowerShell if npm.ps1 is blocked. The frontend mock workflow needs no shell hooks, make, camera, backend, database
or secrets. Optional env belongs in apps/web/.env.local.
NEXT_PUBLIC_* variables are build-time public configuration, never secrets.

## Three independent workstreams

| Owner | Scope               | Example branch              |
| ----- | ------------------- | --------------------------- |
| Huy   | features/pose       | feature/cv-engine-lifecycle |
| Dũng  | features/experience | feature/ui-skeleton-overlay |
| Bình  | features/game       | feature/game-hold-service   |

main is stable; develop is integration. Branch from develop.
Use shared contracts and public entrypoints; do not edit another feature's internals.
Agree contract changes first. Composition, routes, root config and lockfile need coordination.
Keep PRs small and avoid unrelated repository-wide formatting.

One root lockfile only. Add dependencies to the proper workspace manifest and install
from root. Resolve lock conflicts by agreeing manifests first, then regenerating with
npm install and reviewing the diff; do not blindly take one side.

## Using mocks

Open /playground under npm run dev. **UI preview** uses buttons/keys 1–8 for manual
pose events and separate experience snapshots; these do not confirm or submit.
Returning to a preview fixture preserves its fixed mapping.
**Play game (mock)** uses held buttons/keys for continuous frames, a randomized
mapping and automatic confirmation/submission after 1500 ms. Restart/next begins
a new attempt. Releasing input or losing focus clears the simulated pose;
frame silence resets hold progress through an external scheduler.
Tracking loss uses null action, zero confidence and no landmarks. Shortcuts ignore
repeat keydown, modifiers and editable controls. Production /playground returns 404,
and production home has no playground link. See BINH_DEV3_PROGRESS.md for the demo.

Huy can evolve the engine adapter without UI work. Dũng can use manual pose input without
a camera. Bình can test application services against MockQuizGateway without a backend.

## Tests and commands

npm run test runs Vitest once. For web watch mode: npm exec --workspace=@action-quiz/web
-- vitest. Inject clocks/adapters in use-case tests; verify observable behavior in RTL.
Test cleanup, invalid input, arbitrary IDs, tracking loss and stale question handling.
Do not infer real CV performance from jsdom or mock tests.

Before PR run npm run check: formatting, lint, strict types, tests, production build.
Typecheck runs next typegen, so a fresh checkout does not need a build first.
Root scripts route through npm workspaces; CI uses npm ci and Node 24 on Ubuntu.
CI needs no secrets or webcam. The hosted workflow is not claimed to pass before a real run.

## Pull requests and conflicts

Use Conventional Commits: feat(pose): ..., fix(game): ..., docs: ..., chore: ...
Open feature PRs into develop and use the PR template. State trigger/behavior and actual
verification results. Review contracts, import direction, resource cleanup and cross-module
impact. Sync develop frequently under the team's rebase/merge policy; never force-push
shared branches. See ../CONTRIBUTING.md.

## Backend/database workstream

Python is isolated in apps/api/.venv and locked in apps/api/uv.lock.
Do not add a package.json or npm lockfile under apps/api.

Direct Windows-compatible commands:

- uv sync --directory apps/api --frozen
- docker compose up -d --wait postgres
- uv run --directory apps/api --frozen alembic upgrade head
- uv run --directory apps/api --frozen action-quiz-api
- npm run dev (separate terminal)

The database listens at localhost:55432; the local API at localhost:8000.
Compose API uses postgres:5432 internally. See DATABASE.md for optional Docker API
and how to select another host API port. Do not stop other projects' containers.

Root backend commands are also available via npm run api:sync/api:dev/api:test/api:lint/
api:format/api:format:check/api:typecheck/api:check. Use npm.cmd on restricted PowerShell.
npm run check remains frontend-only; npm run check:all covers web and backend.
DB tests require a dedicated *_test database; see DATABASE.md. Unit/API tests need no DB.

Backend tests are split into tests/unit, tests/api and opt-in tests/integration.
Ruff formats/checks Python; Prettier formats web/Markdown/YAML; mypy checks app code.
CI retains the frontend job and adds independent backend and PostgreSQL integration jobs.
No secrets, production credentials or camera are needed.

Coordinate backend contract design with Bình and the shared-contract owners.
Future question/session/answer/scoring/history work must start with agreed domain rules.
Backend HTTP DTOs use Pydantic/OpenAPI; browser CV contracts stay in TypeScript.
See API_CONTRACTS.md before defining a business endpoint.
