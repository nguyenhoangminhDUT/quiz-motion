# Contributing

## Setup and branches

Clone, cd root, npm ci, npm run dev. Node 24 LTS is recommended.
Windows PowerShell may require npm.cmd instead of npm.

main: stable; develop: integration. Branch from develop using feature/cv-_,
feature/ui-_, feature/game-_, fix/_ or chore/*.
These are conventions; Phase 0 creates no remote branches or branch protection.

Huy owns apps/web/features/pose/, Dũng owns experience/, Bình owns game/.
Shared contracts require all three owners' review. Coordinate composition/config/lockfile edits.

## Naming and commits

Kebab-case files/folders; PascalCase React components/types; camelCase functions/variables.
Conventional Commits examples: feat(pose): add engine lifecycle;
fix(game): reset stale candidate; docs: explain coordinates; chore: update tooling.
Avoid any, ts-ignore and unchecked assertions. Never commit generated builds, local env,
camera frames or secrets.

## Pull request workflow

1. Sync develop and create a focused feature branch.
2. Agree shared contract changes before dependent implementation.
3. Add meaningful behavior/rule/cleanup tests and update docs.
4. Run npm run check from root.
5. Open PR into develop with actual results and limitations.
6. Obtain reviews and merge according to team policy.

Review: build/lint/types/tests/format pass, no secrets, compatible contracts, correct
dependency direction, effects on other modules, cleanup and current documentation.
Do not mix broad formatting or dependency upgrades into feature work.

## Shared API and merge conflicts

Contract changes include old/new payload examples, semantics/units, affected producers
and consumers, migration and version bump. Breaking changes update consumers in the same PR.
Do not change the meaning of stable ActionIds.

Stay within feature ownership and import public entrypoints. Coordinate route/composition
edits in advance. Keep one root lockfile; resolve manifests before npm install regenerates it.
Do not create meaningless placeholder layers/files.
Read docs/DEVELOPMENT.md and docs/MODULE_CONTRACTS.md before the first feature PR.

## Backend changes

Coordinate apps/api work with B?nh and all HTTP contract consumers. Review migrations
and transaction cleanup, run npm run check:all, and run opt-in database tests only
against an isolated *_test database. Commit both manifests and lockfiles as files in
the eventual team PR; no automatic Git commit or push is part of initialization.
