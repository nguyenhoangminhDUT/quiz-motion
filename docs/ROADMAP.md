# Roadmap

## Phase 0 — Project initialization

Implemented: npm monorepo, Next UI, contracts, ports, manual/in-memory mocks,
composition, home and development playground, tests, quality tooling, CI definition,
architecture and team workflow docs. Actual command results: PHASE_0_REPORT.md.
Hosted CI execution remains pending a push; nothing is deployed.

## Phase 1 — CV Engine & 8 action classifiers — TODO / Huy

Implement PoseEngine using @mediapipe/tasks-vision, camera lifecycle, landmark conversion,
eight geometry classifiers, tracking status and smoothing. Agree left/right and confidence
semantics before implementation. Test allowed synthetic/recorded data, partial poses and
permission failure. No model, SDK dependency or inference exists in Phase 0.

## Phase 2 — Canvas & Visual Experience — IN PROGRESS / Dũng

Video viewport, real skeleton overlay, feedback effects, hold ring, audio, responsive
gameplay and accessibility. Keep RAF drawing outside broad React state subscriptions.
Experience subphase 1 (layout) is implemented in the development playground:
props-driven gameplay screen, camera placeholder, question and four answer cards,
eight action illustrations/instructions, responsive layout and separate development controls.
Experience subphase 2 adds Canvas rendering from eight hand-authored landmark
fixtures, mirroring, partial input, resize/display-density handling and tracking-loss
clearing. The mock pose engine still emits empty landmarks; samples are presentation
fixtures only. Experience subphases 3–4 add independent view-state simulation,
manual progress, a hold ring, textual/visual feedback and opt-in Web Audio cues.
Subphase 5 adds accessibility support and automated reset/resource/integration checks.
Real-browser layout, audio and assistive-technology checks are still pending;
see [Experience QA](EXPERIENCE_QA.md). Real video alignment, camera/model integration
and real game-state wiring remain TODO.
See [Experience](../apps/web/features/experience/README.md) for preview and integration details.

## Phase 3 — Game State / Randomizer / Hold Detection — TODO / Bình

Pure injected-RNG selection of four distinct actions, stable mapping, state transitions
and continuous 1500 ms hold. Reset on lost tracking, invalid action, candidate changes
or question changes. Discard stale events, prevent duplicate confirmation/submission.
Use monotonic timestamps, not assumed frame rates.

## Phase 4 — Quiz API Integration — TODO / Bình

Agree API spec before endpoints. Implement HTTP QuizGateway, DTO validation, real
option/attempt IDs, cancellation, failures and idempotency. Correct answers remain server-side.
No auth, backend or database is included in Phase 0.

## Phase 5 — Integration Testing / QA / Performance — TODO / team

Real-adapter browser tests, camera permission/failure matrix and accessibility.
Benchmark inference/render separately on described hardware, track dropped frames,
and confirm no frames are uploaded/stored by default. 30 FPS is an unverified target.

## Phase 0 backend/database extension

Implemented: FastAPI factory/configuration, health/readiness, async SQLAlchemy lifecycle,
PostgreSQL Compose, Alembic empty baseline, HTTP health indicator, Python lockfile,
Ruff/mypy/pytest and backend/database CI definitions. Verification evidence is in
PHASE_0_BACKEND_DB_REPORT.md. There are no Quiz business tables or business endpoints.

Next backend work: agree question/session/answer/scoring/history domain models,
repository contracts and initial business migrations; generate API types from OpenAPI
once business endpoints exist. Full Quiz submission and scoring remain future work.
