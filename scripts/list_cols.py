import os
import sqlalchemy as sa
url = os.environ.get("DATABASE_URL", os.environ.get("DATABASE_URL", "postgresql://localhost/attendance"))
engine = sa.create_engine(url, connect_args={'connect_timeout': 5})
with engine.connect() as c:
    cols = c.execute(sa.text("SELECT column_name FROM information_schema.columns WHERE table_name='timetables'")).mappings().all()
    print([t['column_name'] for t in cols])
