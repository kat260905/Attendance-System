from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from flask_migrate import Migrate
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from io import StringIO, BytesIO
import csv 
from datetime import datetime, date 
import pytz
from dotenv import load_dotenv 
import os 
<<<<<<< HEAD
from models import db, User, Student, Faculty, Subject, ClassSession, Attendance, AttendanceLog, AttendanceStatus, UserRole, Timetable,  FacultySubjectClass, Class
from datetime import datetime, timedelta
import pytz


IST = pytz.timezone("Asia/Kolkata")

=======
from models import db, User, Student, Faculty, Subject, ClassSession, Attendance, AttendanceLog, AttendanceStatus, UserRole


>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
app= Flask(__name__)
CORS(app)  # Enable CORS for all routes

load_dotenv()

app.config['SQLALCHEMY_DATABASE_URI']=os.getenv('DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS']=False

#db= SQLAlchemy(app)
db.init_app(app)
migrate=Migrate(app, db)
socketio= SocketIO(app, cors_allowed_origins="*")


<<<<<<< HEAD
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
#from your_module import generate_weekly_sessions  # import your function


def generate_weekly_sessions():
    """
    Creates class sessions for the upcoming academic week based on the timetable.
    Runs every Sunday at midnight IST.
    """

    with app.app_context():   
        today = datetime.now(IST).date()
        #monday = today - timedelta(days=today.weekday())  # This week's Monday
        monday = today - timedelta(days=today.weekday()) + timedelta(days=7)

        print("Weekly Session Generator Running at:", datetime.now(IST))

        timetables = Timetable.query.all()

        # Weekday order mapping
        weekday_map = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        for t in timetables:
            weekday_index = weekday_map.index(t.day_of_week)
            session_date = monday + timedelta(days=weekday_index)

            fsc = FacultySubjectClass.query.filter_by(
                faculty_id=t.faculty_id,
                subject_id=t.subject_id
            ).first()

            if not fsc:
                print(f"[ERROR] No class assigned for faculty {t.faculty_id} and subject {t.subject_id}")
                continue

            class_id = fsc.class_id

            # Avoid duplicates
            with db.session.no_autoflush:
                exists = ClassSession.query.filter_by(
                    faculty_id=t.faculty_id,
                    subject_id=t.subject_id,
                    class_id=class_id,
                    date=session_date,
                    start_time=t.start_time
                ).first()

            if exists:
                continue

            session = ClassSession(
                faculty_id=t.faculty_id,
                subject_id=t.subject_id,
                class_id=class_id, 
                date=session_date,
                start_time=t.start_time,
                end_time=t.end_time,
                topic=f"Weekly class: {t.subject.name}"
            )

            db.session.add(session)

        db.session.commit()
        print("Weekly class sessions generated successfully!")


def start_scheduler():
    scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

    # Runs every Sunday at 00:49 AM IST
    scheduler.add_job(
        generate_weekly_sessions,
        trigger="cron",
        day_of_week="sun",
        hour=10,
        minute=21,
    )

    scheduler.start()
    print("Scheduler started at:", datetime.now(IST))


# Start scheduler once
start_scheduler()



@app.route("/api/generate-week-sessions", methods=["POST"])
def generate_week():
    return generate_weekly_sessions()


=======
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
@app.route("/test-db")
def test_db():
    try:
        result = db.session.execute(text("SELECT 1")).fetchall()
        return f"Database connection successful! Result: {result}"
    except Exception as e:
        return f"Database connection failed: {e}"

@app.route("/api/debug/users")
def debug_users():
    """Debug endpoint to check what users exist in the database"""
    try:
        users = User.query.all()
        user_list = []
        for user in users:
            user_list.append({
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value
            })
        
        return jsonify({
            "status": "success",
            "total_users": len(user_list),
            "users": user_list
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "Failed to fetch users",
            "error": str(e)
        }), 500
   

    

# Helper: permission decorator placeholder (ERP will have auth)
def require_faculty(f):
    def wrapper(*args, **kwargs):
        # In production, check session/jwt and ensure user.role == faculty
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# Authentication endpoints
@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        email = data.get("email")
        password = data.get("password")  # In production, hash and verify password
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        print(f"Login attempt for email: {email}")  # Debug log
        
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"User not found for email: {email}")  # Debug log
            # Check if any users exist in database
            total_users = User.query.count()
            print(f"Total users in database: {total_users}")  # Debug log
            return jsonify({"error": "Invalid credentials"}), 401
        
        print(f"User found: {user.name} ({user.role.value})")  # Debug log
        
<<<<<<< HEAD
        faculty_id = None
        if user.role == UserRole.FACULTY:
            faculty = Faculty.query.filter_by(user_id=user.id).first()
            if faculty:
                faculty_id = faculty.id
=======
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
        # In production, verify password hash
        return jsonify({
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
<<<<<<< HEAD
                "role": user.role.value,
                "faculty_id": faculty_id, 
=======
                "role": user.role.value
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
            },
            "message": "Login successful"
        })
    except Exception as e:
        print(f"Login error: {str(e)}")  # Debug log
        return jsonify({"error": f"Login failed: {str(e)}"}), 500

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email")
    name = data.get("name")
    role = data.get("role", "student")
    
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 400
    
    try:
        user = User(
            email=email,
            name=name,
            role=UserRole(role)
        )
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value
            },
            "message": "Registration successful"
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route("/api/auth/me", methods=["GET"])
def get_current_user():
    # In production, get user from JWT token
    user_id = request.args.get("user_id", 1)  # Placeholder
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value
    })

# Student management endpoints
@app.route("/api/students", methods=["GET"])
def get_students():
    students = Student.query.all()
    return jsonify([{
        "id": s.id,
        "roll_no": s.roll_no,
        "name": s.name,
        "department": s.department,
        "year": s.year
    } for s in students])

@app.route("/api/students", methods=["POST"])
def create_student():
    data = request.get_json()
    try:
        student = Student(
            roll_no=data["roll_no"],
            name=data["name"],
            department=data.get("department"),
            year=data.get("year")
        )
        db.session.add(student)
        db.session.commit()
        return jsonify({"id": student.id, "message": "Student created successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route("/api/students/<int:student_id>", methods=["GET"])
def get_student(student_id):
    student = Student.query.get_or_404(student_id)
    return jsonify({
        "id": student.id,
        "roll_no": student.roll_no,
        "name": student.name,
        "department": student.department,
        "year": student.year
    })

<<<<<<< HEAD
#getByFacultySubject: (subject_id, faculty_id) => api.get(`/students/${subject_id}/${faculty_id}`)
@app.route("/api/sessions/<int:session_id>/students", methods=["GET"])
def get_by_session(session_id):
    session = ClassSession.query.get(session_id)
    if not session:
        return {"error": "Session not found"}, 404

    # 2. Get the class_id from the session
    class_id = session.class_id

    # 3. Fetch all students in that class
    students = Student.query.filter_by(class_id=class_id).all()

    # 4. Convert to JSON format
    return jsonify([{
            "id": s.id,
            "roll_no": s.roll_no,
            "name": s.name,
            "department": s.department,
            "year": s.year,
            "class_id": s.class_id
        }
        for s in students])
        
   
=======
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
# Faculty management endpoints
@app.route("/api/faculty", methods=["GET"])
def get_faculty():
    faculty = Faculty.query.all()
    return jsonify([{
        "id": f.id,
        "user_id": f.user_id,
        "name": f.user.name,
        "email": f.user.email,
        "department": f.department
    } for f in faculty])

@app.route("/api/faculty", methods=["POST"])
def create_faculty():
    data = request.get_json()
    try:
        # Create user first
        user = User(
            email=data["email"],
            name=data["name"],
            role=UserRole.FACULTY
        )
        db.session.add(user)
        db.session.flush()
        
        # Create faculty profile
        faculty = Faculty(
            user_id=user.id,
            department=data.get("department")
        )
        db.session.add(faculty)
        db.session.commit()
        
        return jsonify({"id": faculty.id, "message": "Faculty created successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

<<<<<<< HEAD
@app.route("/api/faculty/<int:faculty_id>/classes", methods=["GET"])
def get_faculty_classes(faculty_id):
    rows = db.session.query(
        FacultySubjectClass,
        Subject,
        Class
    ).join(
        Subject, FacultySubjectClass.subject_id == Subject.id
    ).join(
        Class, FacultySubjectClass.class_id == Class.id
    ).filter(
        FacultySubjectClass.faculty_id == faculty_id
    ).all()

    return jsonify([
        {
             "class_id": cls.id,
            "department": cls.department,
            "year": cls.year,
            "section": cls.section,
            "subject_name": subj.name
        }
        for (_, subj, cls) in rows
    ])


=======
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
# Subject management endpoints
@app.route("/api/subjects", methods=["GET"])
def get_subjects():
    subjects = Subject.query.all()
    return jsonify([{
        "id": s.id,
        "code": s.code,
        "name": s.name,
        "semester": s.semester
    } for s in subjects])

@app.route("/api/subjects", methods=["POST"])
def create_subject():
    data = request.get_json()
    try:
        subject = Subject(
            code=data["code"],
            name=data["name"],
            semester=data.get("semester")
        )
        db.session.add(subject)
        db.session.commit()
        return jsonify({"id": subject.id, "message": "Subject created successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

# Class Session management endpoints
@app.route("/api/class-sessions", methods=["GET"])
def get_class_sessions():
    sessions = ClassSession.query.all()
    return jsonify([{
        "id": s.id,
        "subject_id": s.subject_id,
        "subject_name": s.subject.name,
        "faculty_id": s.faculty_id,
        "faculty_name": s.faculty.user.name,
        "date": s.date.isoformat(),
        "start_time": s.start_time.isoformat() if s.start_time else None,
        "end_time": s.end_time.isoformat() if s.end_time else None,
        "topic": s.topic
    } for s in sessions])

@app.route("/api/class-sessions", methods=["POST"])
def create_class_session():
    data = request.get_json()
    try:
        session = ClassSession(
            subject_id=data["subject_id"],
            faculty_id=data["faculty_id"],
            date=datetime.strptime(data["date"], "%Y-%m-%d").date(),
            start_time=datetime.strptime(data["start_time"], "%H:%M").time() if data.get("start_time") else None,
            end_time=datetime.strptime(data["end_time"], "%H:%M").time() if data.get("end_time") else None,
            topic=data.get("topic")
        )
        db.session.add(session)
        db.session.commit()
        return jsonify({"id": session.id, "message": "Class session created successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route("/api/class-sessions/faculty/<int:faculty_id>", methods=["GET"])
def get_faculty_sessions(faculty_id):
    sessions = ClassSession.query.filter_by(faculty_id=faculty_id).all()
<<<<<<< HEAD
    print(sessions)
=======
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
    return jsonify([{
        "id": s.id,
        "subject_id": s.subject_id,
        "subject_name": s.subject.name,
        "date": s.date.isoformat(),
        "start_time": s.start_time.isoformat() if s.start_time else None,
        "end_time": s.end_time.isoformat() if s.end_time else None,
        "topic": s.topic
    } for s in sessions])

<<<<<<< HEAD
@app.route("/api/class-sessions/class/<int:class_id>", methods=["GET"])
def get_sessions_by_class(class_id):
    sessions = ClassSession.query.filter_by(class_id=class_id).all()
    return jsonify([
        {
            "id": s.id,
            "subject_id": s.subject_id,
            "subject_name": s.subject.name,
            "date": s.date.isoformat(),
            "start_time": s.start_time.isoformat(),
            "end_time": s.end_time.isoformat()
        }
        for s in sessions
    ])


=======
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
@app.route("/api/attendance/mark", methods=["POST"])
@require_faculty
def mark_attendance():
    """
    Payload example:
    {
      "session_id": 12,
      "records": [
        {"student_id": 101, "status": "present"},
        {"student_id": 102, "status": "absent"}
      ],
      "marked_by": 45
    }
    """
<<<<<<< HEAD

=======
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
    try:
        data = request.get_json()
        print(f"Received attendance data: {data}")  # Debug log
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        session_id = data.get("session_id")
        records = data.get("records")
        marked_by = data.get("marked_by")
        
        if not session_id:
            return jsonify({"error": "session_id is required"}), 400
        if not records:
            return jsonify({"error": "records is required"}), 400
        if not marked_by:
            return jsonify({"error": "marked_by is required"}), 400
            
        print(f"Processing attendance for session {session_id}, marked by {marked_by}, {len(records)} records")  # Debug log
        
        results = []

        for r in records:
            student_id = r["student_id"]
            status = AttendanceStatus(r.get("status"))
            reason = r.get("reason")

            att = Attendance.query.filter_by(session_id=session_id, student_id=student_id).first()

            if not att:
                att = Attendance(
                    session_id=session_id,
                    student_id=student_id,
                    status=status,
                    marked_by=marked_by,
                    marked_at=datetime.now(pytz.timezone('Asia/Kolkata')),
                    reason=reason
                )
                db.session.add(att)
                db.session.flush()

                log = AttendanceLog(
                    attendance_id=att.id,
                    prev_status=None,
                    new_status=status.value,
                    changed_by=marked_by,
                    changed_at=datetime.now(pytz.timezone('Asia/Kolkata')),
                    note="initial mark"
                )
                db.session.add(log)
            else:
                prev = att.status.value
                att.status = status
                att.marked_by = marked_by
                att.marked_at = datetime.now(pytz.timezone('Asia/Kolkata'))
                att.reason = reason

                log = AttendanceLog(
                    attendance_id=att.id,
                    prev_status=prev,
                    new_status=status.value,
                    changed_by=marked_by,
                    changed_at=datetime.now(pytz.timezone('Asia/Kolkata')),
                    note="updated mark"
                )
                db.session.add(log)

            results.append({"student_id": student_id, "status": status.value})

            payload = {
                "session_id": session_id,
                "student_id": student_id,
                "status": status.value,
                "marked_by": marked_by,
                "marked_at": datetime.now(pytz.timezone('Asia/Kolkata')).isoformat()
            }
            socketio.emit('attendance_marked', payload)

        db.session.commit()
        print(f"Successfully marked attendance for {len(results)} students")  # Debug log
        return jsonify({"marked": results}), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(traceback.format_exc())   # <-- This will show the full error in terminal
        return jsonify({"error": str(e)}), 400
        '''
        db.session.rollback()
        print(f"Error marking attendance: {str(e)}")  # Debug log
        return jsonify({"error": str(e)}), 400
        '''


# Get attendance for a session
@app.route("/api/attendance/session/<int:session_id>", methods=["GET"])
def get_session_attendance(session_id):
    rows = db.session.query(Attendance).filter_by(session_id=session_id).all()
    return jsonify([{
        "attendance_id": r.id,
        "student_id": r.student_id,
        "student_name": r.student.name,
        "department": r.student.department,
        "status": r.status.value,
        "marked_by": r.marked_by,
        "marked_at": r.marked_at.isoformat(),
        "reason": r.reason
    } for r in rows])


# Update attendance
@app.route("/api/attendance/<int:attendance_id>", methods=["PUT"])
@require_faculty
def update_attendance(attendance_id):
    data = request.get_json()
    new_status = data.get("status")
    changed_by = data.get("changed_by")
    reason = data.get("reason")

    att = Attendance.query.get_or_404(attendance_id)
    prev = att.status.value
    att.status = AttendanceStatus(new_status)
    att.marked_by = changed_by
    att.marked_at = datetime.now(pytz.timezone('Asia/Kolkata'))
    att.reason = reason

    log = AttendanceLog(
        attendance_id=att.id,
        prev_status=prev,
        new_status=new_status,
        changed_by=changed_by,
        changed_at=datetime.now(pytz.timezone('Asia/Kolkata')),
        note="manual update"
    )
    db.session.add(log)
    db.session.commit()

    payload = {
        "attendance_id": att.id,
        "student_id": att.student_id,
        "new_status": new_status,
        "changed_by": changed_by
    }
    socketio.emit('attendance_updated', payload)

    return jsonify({"ok": True})


# Attendance report with optional department filter
@app.route("/api/attendance/report", methods=["GET"])
def attendance_report():
    """
    GET params:
    - student_id
    - faculty_id
    - subject_id
    - from (YYYY-MM-DD)
    - to (YYYY-MM-DD)
    - group_by (student, subject)
    """
    q = db.session.query(Attendance).join(ClassSession, Attendance.session_id == ClassSession.id)
    student_id = request.args.get("student_id")
    faculty_id = request.args.get("faculty_id")
    subject_id = request.args.get("subject_id")
    department = request.args.get("department")  # optional filter
    from_date = request.args.get("from")
    to_date = request.args.get("to")

    if student_id:
        q = q.filter(Attendance.student_id == int(student_id))
    if faculty_id:
        q = q.filter(ClassSession.faculty_id == int(faculty_id))
    if subject_id:
        q = q.filter(ClassSession.subject_id == int(subject_id))
    if department:
        q = q.join(Student).filter(Student.department == department)
    if from_date:
        q = q.filter(ClassSession.date >= datetime.strptime(from_date, "%Y-%m-%d").date())
    if to_date:
        q = q.filter(ClassSession.date <= datetime.strptime(to_date, "%Y-%m-%d").date())

    items = q.all()

    summary = {}
    total = 0
    for it in items:
        s = it.status.value
        summary[s] = summary.get(s, 0) + 1
        total += 1

    return jsonify({"total_records": total, "summary": summary})


# CSV export
@app.route("/api/attendance/export", methods=["GET"])
def export_attendance():
    q = db.session.query(Attendance).join(ClassSession, Attendance.session_id == ClassSession.id)
<<<<<<< HEAD
    
    session_id = request.args.get("session_id")
    student_id = request.args.get("student_id")
    department = request.args.get("department")

    if session_id:
        q = q.filter(Attendance.session_id == int(session_id))
=======
    student_id = request.args.get("student_id")
    department = request.args.get("department")

>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
    if student_id:
        q = q.filter(Attendance.student_id == int(student_id))
    if department:
        q = q.join(Student).filter(Student.department == department)

    rows = q.all()
    si = StringIO()
    writer = csv.writer(si)
    writer.writerow(["attendance_id", "session_id", "session_date", "student_id", "student_name", "department", "status", "marked_by", "marked_at", "reason"])

    for r in rows:
        writer.writerow([
            r.id,
            r.session_id,
            r.session.date.isoformat(),
            r.student_id,
            r.student.name,
            r.student.department,
            r.status.value,
            r.marked_by,
            r.marked_at.isoformat(),
            r.reason or ""
        ])

    mem = BytesIO()
    mem.write(si.getvalue().encode("utf-8"))
    mem.seek(0)
    si.close()

    return send_file(
        mem,
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"attendance_export_{date.today().isoformat()}.csv"
    )


# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')

@socketio.on('join_session')
def handle_join_session(data):
    session_id = data['sessionId']
    join_room(f'session_{session_id}')
    print(f'Client {request.sid} joined session {session_id}')

@socketio.on('leave_session')
def handle_leave_session(data):
    session_id = data['sessionId']
    leave_room(f'session_{session_id}')
    print(f'Client {request.sid} left session {session_id}')

if __name__ == "__main__":
    # socketio.run(app, host="0.0.0.0", port=5000)
<<<<<<< HEAD
    socketio.run(app, host="127.0.0.1", port=5001, debug=True, use_reloader=True)
=======
    socketio.run(app, host="127.0.0.1", port=5000, debug=True, use_reloader=True)
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c




#if __name__=="__main__":
#    app.run(debug=True)