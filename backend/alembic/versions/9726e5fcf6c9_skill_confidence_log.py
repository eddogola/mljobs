"""skill confidence log

Revision ID: 9726e5fcf6c9
Revises: b75a79a87606
Create Date: 2026-06-07 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9726e5fcf6c9'
down_revision: Union[str, Sequence[str], None] = 'b75a79a87606'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'skill_confidence_log',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('skill', sa.String(), nullable=False),
        sa.Column('value', sa.Integer(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['skill'], ['saved_skills.skill'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_skill_confidence_log_skill'), 'skill_confidence_log', ['skill'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_skill_confidence_log_skill'), table_name='skill_confidence_log')
    op.drop_table('skill_confidence_log')
