"""initial schema

Revision ID: a37cd7b82816
Revises: 
Create Date: 2026-06-07 18:12:45.014290

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a37cd7b82816'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "jobs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("url", sa.String(), nullable=False, unique=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("company", sa.String(), nullable=False),
        sa.Column("location", sa.String()),
        sa.Column("remote", sa.String()),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("posted_at", sa.DateTime()),
        sa.Column("ingested_at", sa.DateTime()),
        sa.Column("parse_status", sa.String(), server_default="unparsed"),
    )
    op.create_table(
        "job_analysis",
        sa.Column("job_id", sa.String(), sa.ForeignKey("jobs.id"), primary_key=True),
        sa.Column("role_summary", sa.Text()),
        sa.Column("seniority", sa.String()),
        sa.Column("ml_domain", sa.String()),
        sa.Column("must_have_technical", sa.JSON()),
        sa.Column("must_have_non_technical", sa.JSON()),
        sa.Column("nice_to_have_technical", sa.JSON()),
        sa.Column("tech_stack", sa.JSON()),
        sa.Column("domain_knowledge", sa.JSON()),
        sa.Column("core_concepts", sa.JSON()),
        sa.Column("interview_topics", sa.JSON()),
        sa.Column("experience_signals", sa.JSON()),
        sa.Column("red_flags", sa.JSON()),
        sa.Column("parsed_at", sa.DateTime()),
    )


def downgrade() -> None:
    op.drop_table("job_analysis")
    op.drop_table("jobs")
