"""Add student OD request workflow

Revision ID: add_student_od_workflow
Revises: add_performance_indexes
Create Date: 2026-02-12 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_student_od_workflow'
down_revision = 'add_performance_indexes'
branch_labels = None
depends_on = None


def upgrade():
    # Add user_id to students table (for login)
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_students_user', 'users', ['user_id'], ['id'])
        batch_op.create_index('idx_students_user', ['user_id'], unique=False)
    
    # Create student_od_requests table
    op.create_table(
        'student_od_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=False),
        sa.Column('from_date', sa.Date(), nullable=False),
        sa.Column('to_date', sa.Date(), nullable=False),
        sa.Column('session_ids', sa.JSON(), nullable=True),
        sa.Column('reason', sa.String(length=1000), nullable=False),
        sa.Column('supporting_document', sa.String(length=500), nullable=True),
        sa.Column('status', sa.Enum('pending', 'approved', 'rejected', 'applied', 'cancelled', 
                                    name='odrequestatus'), nullable=False),
        sa.Column('requested_at', sa.DateTime(), nullable=False),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('admin_remarks', sa.String(length=500), nullable=True),
        sa.Column('approved_od_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['approved_od_id'], ['approved_od_requests.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for student_od_requests
    with op.batch_alter_table('student_od_requests', schema=None) as batch_op:
        batch_op.create_index('idx_student_od_student', ['student_id'], unique=False)
        batch_op.create_index('idx_student_od_status', ['status'], unique=False)
        batch_op.create_index('idx_student_od_dates', ['from_date', 'to_date'], unique=False)
        batch_op.create_index('idx_student_od_class', ['class_id'], unique=False)
        batch_op.create_index('idx_student_od_requested_at', ['requested_at'], unique=False)
    
    # Add student_request_id to approved_od_requests
    with op.batch_alter_table('approved_od_requests', schema=None) as batch_op:
        batch_op.add_column(sa.Column('student_request_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_approved_od_student_request', 'student_od_requests', 
                                    ['student_request_id'], ['id'])
        batch_op.create_index('idx_od_student_request', ['student_request_id'], unique=False)


def downgrade():
    # Remove student_request_id from approved_od_requests
    with op.batch_alter_table('approved_od_requests', schema=None) as batch_op:
        batch_op.drop_index('idx_od_student_request')
        batch_op.drop_constraint('fk_approved_od_student_request', type_='foreignkey')
        batch_op.drop_column('student_request_id')
    
    # Drop student_od_requests table
    op.drop_table('student_od_requests')
    
    # Remove user_id from students table
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_index('idx_students_user')
        batch_op.drop_constraint('fk_students_user', type_='foreignkey')
        batch_op.drop_column('user_id')
