import os
import sqlalchemy as sa
from datetime import datetime, time
import pytz

url = os.environ.get("DATABASE_URL", os.environ.get("DATABASE_URL", "postgresql://localhost/attendance"))
engine = sa.create_engine(url, connect_args={'connect_timeout': 5})

def main():
    IST = pytz.timezone('Asia/Kolkata')
    with engine.begin() as conn:
        f = conn.execute(sa.text('SELECT id FROM faculties ORDER BY id LIMIT 1')).mappings().first()
        c = conn.execute(sa.text('SELECT id FROM classes ORDER BY id LIMIT 1')).mappings().first()
        s = conn.execute(sa.text('SELECT id FROM subjects ORDER BY id LIMIT 1')).mappings().first()
        
        if not (f and c and s):
            print("Missing DB rows.")
            return
            
        f_id, c_id, s_id = f['id'], c['id'], s['id']
        print(f"Using Faculty:{f_id}, Class:{c_id}, Subject:{s_id}")

        # faculty_subject_class
        fsc = conn.execute(sa.text(f"SELECT id FROM faculty_subject_class WHERE faculty_id={f_id} AND class_id={c_id} AND subject_id={s_id}")).mappings().first()
        if not fsc:
            conn.execute(sa.text(f"INSERT INTO faculty_subject_class (faculty_id, class_id, subject_id) VALUES ({f_id}, {c_id}, {s_id})"))
            print("Mapped FacultySubjectClass")

        # timetable
        tt = conn.execute(sa.text(f"SELECT id FROM timetables WHERE faculty_id={f_id} AND class_id={c_id} AND subject_id={s_id} AND day_of_week='Saturday'")).mappings().first()
        if not tt:
            conn.execute(sa.text(f"INSERT INTO timetables (class_id, subject_id, faculty_id, day_of_week, start_time, end_time) VALUES ({c_id}, {s_id}, {f_id}, 'Saturday', '10:00:00', '11:00:00')"))
            print("Created Saturday Timetable")
            
        # class_sessions format: date, start_time, end_time, topic, faculty_id, class_id, subject_id    
        today_date = datetime.now(IST).date()
        today_name = today_date.strftime("%A")
        if today_name == 'Saturday':
            cs = conn.execute(sa.text(f"SELECT id FROM class_sessions WHERE faculty_id={f_id} AND subject_id={s_id} AND date='{today_date}'")).mappings().first()
            if not cs:
                conn.execute(sa.text(f"INSERT INTO class_sessions (faculty_id, class_id, subject_id, date, start_time, end_time, topic) VALUES ({f_id}, {c_id}, {s_id}, '{today_date}', '10:00:00', '11:00:00', 'Saturday Special Session')"))
                print(f"Created ClassSession for {today_date}")
            else:
                print("Session already exists")

if __name__ == '__main__':
    main()