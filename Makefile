.PHONY: db-up db-down api-sync api-dev api-test api-lint api-format api-format-check db-migrate db-current check
db-up:
	docker compose up -d --wait postgres
db-down:
	docker compose stop postgres
api-sync:
	uv sync --directory apps/api --frozen
api-dev:
	uv run --directory apps/api --frozen action-quiz-api
api-test:
	uv run --directory apps/api --frozen pytest
api-lint:
	uv run --directory apps/api --frozen ruff check .
api-format:
	uv run --directory apps/api --frozen ruff format .
api-format-check:
	uv run --directory apps/api --frozen ruff format --check .
db-migrate:
	uv run --directory apps/api --frozen alembic upgrade head
db-current:
	uv run --directory apps/api --frozen alembic current
check:
	npm run check:all

