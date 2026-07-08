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

        print(f"Target Faculty: {faculty.user.name}")
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
        # Let's ensure this faculty doesn't already have something clashing here
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
        
        # Is today a Saturday?
        today_name = today_date.strftime("%A")
        print(f"Today is {today_name}, {today_date}")
        
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
                    topic='Saturday Special'
                )
                db.session.add(session)
                print(f"Instantiated actual ClassSession for today ({today_date}).")
                print(f"You can log in as Faculty (email: {faculty.user.email}) to see it.")
            else:
                print(f"Session for today already exists! ID: {session.id}")
                
        db.session.commit()
        print("Done!")

if __name__ == '__main__':
    add_saturday_session()

from app import app, db; from models import Faculty, Class, Subject, Timetable, FacultySubjectClass, ClassSession; from datetime import datetime, date, time; ctx=app.app_context(); ctx.push(); f = Faculty.query.first(); c = Class.query.first(); s = Subject.query.first(); fsc = FacultySubjectClass.query.filter_by(faculty_id=f.id, class_id=c.id, subject_id=s.id).first();
if not fsc: db.session.add(FacultySubjectClass(faculty_id=f.id, class_id=c.id, subject_id=s.id));
tt = Timetable(class_id=c.id, subject_id=s.id, faculty_id=f.id, day_of_week='Saturday', start_time=time(10,0), end_time=time(11,0)); db.session.add(tt);
td = date.today(); cs = ClassSession.query.filter_by(faculty_id=f.id, date=td, start_time=time(10,0)).first();
if not cs: db.session.add(ClassSession(faculty_id=f.id, class_id=c.id, subject_id=s.id, date=td, start_time=time(10,0), end_time=time(11,0), topic='Saturday Special'));
db.session.commit(); print(f'Added Session for {f.user.name}, Class ID {c.id}, Subject {s.name} on {td}'); ctx.pop()
