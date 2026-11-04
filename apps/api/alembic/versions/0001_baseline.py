"""Initialize Alembic version state without inventing business tables."""

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Baseline only: Alembic creates and maintains its own version table."""


def downgrade() -> None:
    """No business schema changes to reverse."""
