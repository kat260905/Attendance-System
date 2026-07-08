import os
import sqlalchemy as sa
url = os.environ.get("DATABASE_URL", os.environ.get("DATABASE_URL", "postgresql://localhost/attendance"))
engine = sa.create_engine(url, connect_args={'connect_timeout': 5})
with engine.connect() as c:
    tables = c.execute(sa.text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).mappings().all()
    print([t['table_name'] for t in tables])
