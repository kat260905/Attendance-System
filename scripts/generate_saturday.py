from app import app, db
from models import Faculty, Class, Subject, Timetable, FacultySubjectClass, ClassSession
from datetime import datetime, time
import pytz

IST = pytz.timezone('Asia/Kolkata')

def add_saturday_session():
    with app.app_context():
        # Get target entities
        faculty = Faculty.query.first()
        cls = Class.query.first()
        subject = Subject.query.first()
        
        if not (faculty and cls and subject):
            print("Missing DB rows. Please ensure DB is seeded.")
            return

        print(f"Target Faculty: {faculty.user.name} ({faculty.user.email})")
        print(f"Target Class: {cls.department} Year {cls.year}-{cls.section}")
        print(f"Target Subject: {subject.name}")

        # Ensure mapped in FacultySubjectClass
        fsc = FacultySubjectClass.query.filter_by(faculty_id=faculty.id, class_id=cls.id, subject_id=subject.id).first()
        if not fsc:
            fsc = FacultySubjectClass(faculty_id=faculty.id, class_id=cls.id, subject_id=subject.id)
            db.session.add(fsc)
            print("Mapped Faculty with Class and Subject.")

        start_t = time(10, 0)
        end_t = time(11, 0)

        # Create Timetable Entry for Saturday
        tt = Timetable.query.filter_by(
            class_id=cls.id, subject_id=subject.id, faculty_id=faculty.id, day_of_week='Saturday', start_time=start_t
        ).first()
        
        if not tt:
            tt = Timetable(
                class_id=cls.id, 
                subject_id=subject.id, 
                faculty_id=faculty.id, 
                day_of_week='Saturday', 
                start_time=start_t, 
                end_time=end_t
            )
            db.session.add(tt)
            print("Created a Saturday Timetable entry.")
        else:
            print("Saturday Timetable entry already exists.")

        # Generate Today's Actual Session so it immediately appears in the dropdown
        today_date = datetime.now(IST).date()
        today_name = today_date.strftime("%A")
        
        if today_name == "Saturday":
            # Add to ClassSession
            session = ClassSession.query.filter_by(
                faculty_id=faculty.id, date=today_date, subject_id=subject.id
            ).first()

            if not session:
                session = ClassSession(
                    faculty_id=faculty.id, 
                    class_id=cls.id, 
                    subject_id=subject.id, 
                    date=today_date, 
                    start_time=start_t, 
                    end_time=end_t, 
                    topic='Saturday Special Session'
                )
                db.session.add(session)
                print(f"Instantiated actual ClassSession for today ({today_date}).")
                print(f"Login as Faculty: {faculty.user.email} to see it in Mark Attendance.")
            else:
                print(f"Session for today already exists! ID: {session.id}")
                
        db.session.commit()
        print("Done!")

if __name__ == '__main__':
    add_saturday_session()