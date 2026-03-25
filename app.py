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
from models import db, User, Student, Faculty, Subject, ClassSession, Attendance, AttendanceLog, AttendanceStatus, UserRole, Timetable,  FacultySubjectClass, Class, ApprovedODRequest
from datetime import datetime, timedelta
from models import StudentODRequest, ODRequestStatus
from werkzeug.utils import secure_filename
from uuid import uuid4
import redis

IST = pytz.timezone("Asia/Kolkata")

app= Flask(__name__)
CORS(app)  # Enable CORS for all routes

load_dotenv()

# Database configuration - Supabase/PostgreSQL requires SSL
_db_uri = os.getenv('DATABASE_URI')
if _db_uri and 'postgresql' in _db_uri and 'sslmode' not in _db_uri:
    _db_uri = _db_uri + ('&' if '?' in _db_uri else '?') + 'sslmode=require'
if not _db_uri:
    # Fallback to SQLite for local development if no DATABASE_URI set
    _db_uri = 'sqlite:///attendance.db'
    print("Note: No DATABASE_URI found. Using SQLite (attendance.db)")
app.config['SQLALCHEMY_DATABASE_URI'] = _db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

#db= SQLAlchemy(app)
db.init_app(app)
migrate=Migrate(app, db)
socketio= SocketIO(app, cors_allowed_origins="*")

import json
from functools import wraps

# --- Redis Configuration ---
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
redis_client = None
try:
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)
    redis_client.ping() # Check connection
    print("Connected to Redis successfully for caching.")
except redis.ConnectionError:
    redis_client = None
    print("Warning: Redis is not running. Caching will be disabled.")

def cache_response(timeout=120): # 2 mins default
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not redis_client:
                return f(*args, **kwargs)
            
            # Create a unique cache key based on path and query string
            # Also include kwargs (for URL path vars like <int:user_id>)
            cache_key = f"cache:{request.path}:{request.query_string.decode('utf-8')}"
            
            try:
                cached_val = redis_client.get(cache_key)
                if cached_val:
                    print(f"CACHE HIT [{request.path}]: Loaded from Redis!", flush=True)
                    return jsonify(json.loads(cached_val))
            except Exception as e:
                print(f"Redis get error: {e}")
                
            # If not in cache, compute the response
            print(f"CACHE MISS [{request.path}]: Fetching from Database...", flush=True)
            response = f(*args, **kwargs)
            
            # Cache the JSON data if it's a successful JSON response
            if getattr(response, 'status_code', 500) == 200 and getattr(response, 'is_json', False):
                try:
                    redis_client.setex(cache_key, timeout, json.dumps(response.get_json()))
                except Exception as e:
                    print(f"Redis set error: {e}")
                    
            return response
        return decorated_function
    return decorator

def clear_api_cache():
    if redis_client:
        try:
            keys = redis_client.keys("cache:*")
            if keys:
                redis_client.delete(*keys)
        except Exception as e:
            print(f"Redis clear error: {e}")


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
        
        # Get this week's Monday
        this_monday = today - timedelta(days=today.weekday())
        
        # If it's Friday (4), Saturday (5), or Sunday (6), generate for NEXT week
        # Otherwise, generate for THIS week (to include remaining days like Thursday if today is Wednesday)
        if today.weekday() >= 4:
            monday = this_monday + timedelta(days=7)
        else:
            monday = this_monday

        print(f"Weekly Session Generator Running at: {datetime.now(IST)}")
        print(f"Today: {today} ({['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][today.weekday()]})")
        print(f"Generating sessions for week starting: {monday}")

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
                    start_time=t.start_time,
                    end_time=t.end_time
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
        day_of_week="thu",
        hour=13,
        minute=29,
    )

    scheduler.start()
    print("Scheduler started at:", datetime.now(IST))


# Start scheduler once
@app.route("/api/generate-week-sessions", methods=["POST"])
def generate_week():
    return generate_weekly_sessions()


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
   

from functools import wraps
# Helper: permission decorator placeholder (ERP will have auth)
def require_faculty(f):
    @wraps(f)
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
        requested_role = data.get("role")  # Validate user logs in with correct role
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        print(f"Login attempt for email: {email}, role: {requested_role}")  # Debug log
        
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"User not found for email: {email}")  # Debug log
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Validate that selected role matches user's actual role
        if requested_role and user.role.value != requested_role:
            return jsonify({"error": f"Invalid credentials. Please select {user.role.value.replace('_', ' ')} to sign in."}), 401
        
        print(f"User found: {user.name} ({user.role.value})")  # Debug log
        
        faculty_id = None
        student_id = None
        if user.role == UserRole.FACULTY:
            faculty = Faculty.query.filter_by(user_id=user.id).first()
            if faculty:
                faculty_id = faculty.id
        
        if user.role == UserRole.STUDENT:
            student = Student.query.filter_by(user_id=user.id).first()
            if student:
                student_id = student.id

        # In production, verify password hash
        return jsonify({
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value,
                "faculty_id": faculty_id, 
                "student_id": student_id,
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
    user = db.session.get(User, user_id)
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
    faculty_id = request.args.get("faculty_id", type=int)
    
    if faculty_id:
        # Get class IDs that this faculty handles
        fsc_rows = FacultySubjectClass.query.filter_by(faculty_id=faculty_id).all()
        class_ids = list({r.class_id for r in fsc_rows})
        
        if not class_ids:
            return jsonify([])
        
        # Get students in those classes
        students = Student.query.filter(Student.class_id.in_(class_ids)).all()
    else:
        students = Student.query.all()
    
    return jsonify([{
        "id": s.id,
        "roll_no": s.roll_no,
        "name": s.name,
        "department": s.department,
        "year": s.year,
        "class_id": s.class_id
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

#getByFacultySubject: (subject_id, faculty_id) => api.get(`/students/${subject_id}/${faculty_id}`)
@app.route("/api/sessions/<int:session_id>/students", methods=["GET"])
def get_by_session(session_id):
    session = db.session.get(ClassSession, session_id)
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
            "subject_id": subj.id,
            "department": cls.department,
            "year": cls.year,
            "section": cls.section,
            "subject_name": subj.name
        }
        for (_, subj, cls) in rows
    ])


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
        "semester": s.subject.semester,
        "faculty_id": s.faculty_id,
        "faculty_name": s.faculty.user.name,
        "class_id": s.class_id,
        "year": s.class_data.year,
        "department": s.class_data.department,
        "section": s.class_data.section,
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
    # Show sessions: today_only | week | all
    # today_only = only today (default in some UIs)
    # week = past 14 days + next 30 days (good for attendance dropdown)
    # all = everything
    mode = request.args.get("mode", "week").lower()
    today = datetime.now().date()
    # By default, only show today's sessions for attendance marking
    # Use ?all=true to get all sessions (past and future)
    show_all = request.args.get("all", "false").lower() == "true"
    today = datetime.now(IST).date()
    
    query = ClassSession.query.filter_by(faculty_id=faculty_id)
    
    if mode == "today":
        query = query.filter(ClassSession.date == today)
    elif mode == "week":
        from_date = today - timedelta(days=14)
        to_date = today + timedelta(days=30)
        query = query.filter(ClassSession.date >= from_date, ClassSession.date <= to_date)
    # else mode=="all" - no date filter
    
    # Order by date descending (most recent first), then start time
    sessions = query.order_by(ClassSession.date.desc(), ClassSession.start_time.asc()).all()
    print(f"Faculty {faculty_id} sessions (mode={mode}): {len(sessions)} found")
    
    return jsonify([{
        "id": s.id,
        "subject_id": s.subject_id,
        "subject_name": s.subject.name,
        "semester": s.subject.semester,
        "class_id": s.class_id,
        "year": s.class_data.year,
        "department": s.class_data.department,
        "section": s.class_data.section,
        "date": s.date.isoformat(),
        "start_time": s.start_time.isoformat() if s.start_time else None,
        "end_time": s.end_time.isoformat() if s.end_time else None,
        "topic": s.topic
    } for s in sessions])

@app.route("/api/class-sessions/class/<int:class_id>", methods=["GET"])
def get_sessions_by_class(class_id):
    # Returns ALL sessions (past and future) for review and attendance editing
    # Filter by faculty_id if provided to show only that faculty's sessions
    faculty_id = request.args.get("faculty_id", type=int)
    
    query = ClassSession.query.filter_by(class_id=class_id)
    if faculty_id:
        query = query.filter_by(faculty_id=faculty_id)
    
    # Order by date descending (most recent first), then by start time
    sessions = query.order_by(ClassSession.date.desc(), ClassSession.start_time.asc()).all()
    
    print(f"Class {class_id} sessions (faculty_id={faculty_id}): {len(sessions)} found")
    
    return jsonify([
        {
            "id": s.id,
            "subject_id": s.subject_id,
            "subject_name": s.subject.name,
            "semester": s.subject.semester,
            "faculty_id": s.faculty_id,
            "class_id": s.class_id,
            "year": s.class_data.year,
            "department": s.class_data.department,
            "section": s.class_data.section,
            "date": s.date.isoformat(),
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None
        }
        for s in sessions
    ])


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

    try:
        clear_api_cache() # Clear cache on data update

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


@app.route("/api/attendance/mark-by-suffix", methods=["POST"])
@require_faculty
def mark_attendance_by_suffix():
    """
    Mark attendance by last 3 digits of register number.
    """
    try:
        clear_api_cache()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        session_id = data.get("session_id")
        suffixes_input = data.get("suffixes", "")
        status_str = data.get("status", "present")
        marked_by = data.get("marked_by")
        
        if not session_id:
            return jsonify({"error": "session_id is required"}), 400
        if not suffixes_input:
            return jsonify({"error": "suffixes is required"}), 400
        if not marked_by:
            return jsonify({"error": "marked_by is required"}), 400
        
        # Parse suffixes - support comma, space, or newline separated
        import re
        suffix_list = re.split(r'[,\s\n]+', suffixes_input.strip())
        suffix_list = [s.strip().zfill(3) for s in suffix_list if s.strip()]
        
        if not suffix_list:
            return jsonify({"error": "No valid suffixes provided"}), 400
        
        # Get all students for this session
        session = db.session.get(ClassSession, session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
            
        students = Student.query.filter_by(class_id=session.class_id).all()
        
        status = AttendanceStatus(status_str)
        matched_students = []
        not_found_suffixes = []
        
        for suffix in suffix_list:
            # Find student whose roll_no ends with the suffix (last 3 digits)
            found = False
            for student in students:
                if student.roll_no.endswith(suffix) or student.roll_no.endswith(suffix.lstrip('0')):
                    # Also check if the suffix without leading zeros matches
                    # e.g., "30" should match roll_no ending with "030" or "30"
                    matched_students.append(student)
                    found = True
                    break
            
            if not found:
                # Try matching with the suffix as-is (without zero padding)
                original_suffix = suffix.lstrip('0') or '0'
                for student in students:
                    if student.roll_no[-len(original_suffix):] == original_suffix:
                        matched_students.append(student)
                        found = True
                        break
            
            if not found:
                not_found_suffixes.append(suffix)
        
        results = []
        for student in matched_students:
            att = Attendance.query.filter_by(session_id=session_id, student_id=student.id).first()
            
            if not att:
                att = Attendance(
                    session_id=session_id,
                    student_id=student.id,
                    status=status,
                    marked_by=marked_by,
                    marked_at=datetime.now(pytz.timezone('Asia/Kolkata')),
                    reason=f"Marked via suffix entry"
                )
                db.session.add(att)
                db.session.flush()
                
                log = AttendanceLog(
                    attendance_id=att.id,
                    prev_status=None,
                    new_status=status.value,
                    changed_by=marked_by,
                    changed_at=datetime.now(pytz.timezone('Asia/Kolkata')),
                    note="marked via suffix entry"
                )
                db.session.add(log)
            else:
                prev = att.status.value
                att.status = status
                att.marked_by = marked_by
                att.marked_at = datetime.now(pytz.timezone('Asia/Kolkata'))
                
                log = AttendanceLog(
                    attendance_id=att.id,
                    prev_status=prev,
                    new_status=status.value,
                    changed_by=marked_by,
                    changed_at=datetime.now(pytz.timezone('Asia/Kolkata')),
                    note="updated via suffix entry"
                )
                db.session.add(log)
            
            results.append({
                "student_id": student.id,
                "roll_no": student.roll_no,
                "name": student.name,
                "status": status.value
            })
            
            # Emit socket event
            payload = {
                "session_id": session_id,
                "student_id": student.id,
                "status": status.value,
                "marked_by": marked_by,
                "marked_at": datetime.now(pytz.timezone('Asia/Kolkata')).isoformat()
            }
            socketio.emit('attendance_marked', payload)
        
        db.session.commit()
        
        return jsonify({
            "marked": results,
            "not_found": not_found_suffixes,
            "message": f"Marked {len(results)} students as {status_str}"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 400


# Get attendance for a session
@app.route("/api/attendance/session/<int:session_id>", methods=["GET"])
def get_session_attendance(session_id):
    rows = db.session.query(Attendance).filter_by(session_id=session_id).all()
    return jsonify([{
        "attendance_id": r.id,
        "student_id": r.student_id,
        "student_name": r.student.name,
        "roll_no": r.student.roll_no,
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
    clear_api_cache()
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
    - faculty_id (restricts to students in classes this faculty handles)
    - subject_id
    - class_id
    - from (YYYY-MM-DD)
    - to (YYYY-MM-DD)
    """
    q = db.session.query(Attendance).join(ClassSession, Attendance.session_id == ClassSession.id)
    student_id = request.args.get("student_id")
    faculty_id = request.args.get("faculty_id", type=int)
    class_id = request.args.get("class_id", type=int)
    subject_id = request.args.get("subject_id")
    department = request.args.get("department")  # optional filter
    from_date = request.args.get("from")
    to_date = request.args.get("to")

    if faculty_id:
        # Restrict to students in classes this faculty handles
        fsc_rows = FacultySubjectClass.query.filter_by(faculty_id=faculty_id).all()
        class_ids = list({r.class_id for r in fsc_rows})
        if class_ids:
            q = q.filter(ClassSession.class_id.in_(class_ids))
        else:
            return jsonify({"total_records": 0, "summary": {}, "student_reports": []})

    if class_id:
        q = q.filter(ClassSession.class_id == class_id)
    if student_id:
        q = q.filter(Attendance.student_id == int(student_id))
    if subject_id:
        q = q.filter(ClassSession.subject_id == int(subject_id))
    if department:
        q = q.join(Student).filter(Student.department == department)
    if from_date:
        q = q.filter(ClassSession.date >= datetime.strptime(from_date, "%Y-%m-%d").date())
    if to_date:
        q = q.filter(ClassSession.date <= datetime.strptime(to_date, "%Y-%m-%d").date())

    items = q.all()

    # Overall summary
    summary = {}
    total = 0
    for it in items:
        s = it.status.value
        summary[s] = summary.get(s, 0) + 1
        total += 1

    # Student-wise attendance report
    student_attendance = {}
    for it in items:
        sid = it.student_id
        if sid not in student_attendance:
            student_attendance[sid] = {
                "student_id": sid,
                "student_name": it.student.name,
                "roll_no": it.student.roll_no,
                "total": 0,
                "present": 0,
                "absent": 0,
                "od": 0
            }
        student_attendance[sid]["total"] += 1
        status = it.status.value
        if status == "present":
            student_attendance[sid]["present"] += 1
        elif status == "absent":
            student_attendance[sid]["absent"] += 1
        elif status == "od":
            student_attendance[sid]["od"] += 1

    # Calculate percentage and create list
    student_reports = []
    for sid, data in student_attendance.items():
        if data["total"] > 0:
            data["present_percentage"] = round((data["present"] + data["od"]) / data["total"] * 100, 2)
        else:
            data["present_percentage"] = 0
        student_reports.append(data)

    # Sort by roll number
    student_reports.sort(key=lambda x: x["roll_no"])

    return jsonify({
        "total_records": total, 
        "summary": summary,
        "student_reports": student_reports
    })


# CSV export
@app.route("/api/attendance/export", methods=["GET"])
def export_attendance():
    q = db.session.query(Attendance).join(ClassSession, Attendance.session_id == ClassSession.id)
    
    session_id = request.args.get("session_id")
    student_id = request.args.get("student_id")
    department = request.args.get("department")
    faculty_id = request.args.get("faculty_id", type=int)

    if faculty_id:
        # Restrict to faculty's classes
        fsc_rows = FacultySubjectClass.query.filter_by(faculty_id=faculty_id).all()
        class_ids = list({r.class_id for r in fsc_rows})
        if class_ids:
            q = q.filter(ClassSession.class_id.in_(class_ids))
        else:
            q = q.filter(False)  # No results if faculty has no classes
    
    if session_id:
        q = q.filter(Attendance.session_id == int(session_id))
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


'''
import cv2
import numpy as np
import tempfile
from flask import request, jsonify
import easyocr

reader = easyocr.Reader(['en'], gpu=False)

@app.route("/api/attendance/photo-upload", methods=["POST"])
def upload_attendance_photo():
    if "image" not in request.files:
        return jsonify({"error": "Image is required"}), 400

    file = request.files["image"]

    temp_path = tempfile.mktemp(suffix=".png")
    file.save(temp_path)

    img = cv2.imread(temp_path)
    if img is None:
        return jsonify({"error": "Invalid image"}), 400

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # --- OCR full page ---
    ocr_results = reader.readtext(gray, detail=1)

    # --- Extract roll numbers & names ---
    rows = []
    for (bbox, text, conf) in ocr_results:
        text = text.strip().replace(" ", "")

        # roll number detection
        if text.isdigit() and len(text) >= 10:
            # Get a y-position to align rows
            y = int((bbox[0][1] + bbox[2][1]) / 2)
            rows.append({"roll_no": text, "y": y})

    # Remove duplicates
    unique = {}
    for r in rows:
        unique[r["roll_no"]] = r["y"]
    rows = [{"roll_no": r, "y": unique[r]} for r in unique]

    # Sort by Y position (top to bottom)
    rows = sorted(rows, key=lambda x: x["y"])

    # Map roll number → student name via DB
    output = []
    for r in rows:
        student = Student.query.filter_by(roll_no=r["roll_no"]).first()
        if not student:
            continue

        output.append({
            "roll_no": r["roll_no"],
            "student_id": student.id,
            "name": student.name,
            "status": "absent"  # default, will flip to present if tick found
        })

    # --- Detect tick marks in the right grid ---
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        15, 3
    )

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    tick_positions = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if 12 < w < 40 and 12 < h < 40:  # likely a tick mark
            tick_positions.append((x, y))

    # Mark present if tick is near row
    for row in output:
        ry = row["y"]
        for (tx, ty) in tick_positions:
            if abs(ty - ry) < 18:  # row match tolerance
                row["status"] = "present"

    return jsonify({"results": output})
'''


'''
from paddleocr import PaddleOCR
import cv2
import numpy as np
import tempfile
from flask import request, jsonify

ocr = PaddleOCR(lang='en')

@app.route("/api/attendance/photo-upload", methods=["POST"])
def upload_attendance_photo():
    """
    Extract roll numbers + present/absent from uploaded logbook image.
    Returns list of {student_id, roll_no, name, status}
    """
    if "image" not in request.files:
        return jsonify({"error": "Image is required"}), 400

    file = request.files["image"]

    # Save temporary copy
    temp_path = tempfile.mktemp(suffix=".png")
    file.save(temp_path)

    img = cv2.imread(temp_path)

    if img is None:
        return jsonify({"error": "Invalid image"}), 400

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (3,3), 0)
    thresh = cv2.adaptiveThreshold(
        blur, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        15, 4
    )

    # Detect horizontal & vertical lines (table)
    horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (50, 1))
    vert_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 50))

    horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horiz_kernel)
    vertical = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vert_kernel)

    grid = cv2.add(horizontal, vertical)

    contours, _ = cv2.findContours(grid, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    cells = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w > 40 and h > 20:  # keep only real cells
            cells.append((x, y, w, h))

    # Sort cells top-to-bottom left-to-right
    cells = sorted(cells, key=lambda b: (b[1], b[0]))

    # Extract OCR text for roll_no + name column
    row_data = []
    for (x, y, w, h) in cells:
        if x > img.shape[1] * 0.35:  # names & roll numbers are on left 35%
            continue
        if w < 180:  # ignore very small cells
            continue

        crop = img[y:y+h, x:x+w]
        result = ocr.ocr(crop, cls=True)

        txt = ""
        for line in result:
            for word in line:
                txt += word[1][0] + " "

        txt = txt.strip()

        # Identify roll number pattern
        roll = None
        for word in txt.split():
            if word.isdigit() and len(word) >= 10:
                roll = word

        if roll:
            row_data.append({
                "roll_no": roll,
                "y": y,
                "name": txt.replace(roll, "").strip()
            })

    # Detect tick marks in right-side cells
    output = []
    for row in row_data:
        # Search a cell next to this row
        y = row["y"]

        # find nearest cell in row but to the right side (attendance marks)
        row_cells = [(x,yc,w,h) for (x,yc,w,h) in cells if abs(yc - y) < 15 and x > img.shape[1]*0.35]
        
        present = False
        for (x,yc,w,h) in row_cells:
            crop = img[yc:yc+h, x:x+w]
            crop_gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            _, th = cv2.threshold(crop_gray, 150, 255, cv2.THRESH_BINARY_INV)

            if cv2.countNonZero(th) > 40:  # tick detected
                present = True
                break
        
        output.append({
            "roll_no": row["roll_no"],
            "name": row["name"],
            "status": "present" if present else "absent"
        })

    # Now convert roll_no → student_id from DB

    final_results = []
    for item in output:
        student = Student.query.filter_by(roll_no=item["roll_no"]).first()

        if not student:
            continue

        final_results.append({
            "student_id": student.id,
            "roll_no": item["roll_no"],
            "name": student.name,
            "status": item["status"]
        })

    return jsonify({"results": final_results})
'''


# import easyocr
# from rapidfuzz import fuzz, process
# from PIL import Image
# import numpy as np
# #import paddleocr

# @app.route("/api/attendance/photo-upload", methods=["POST"])
# @require_faculty
# def attendance_photo_upload():

#     session_id = request.form.get("session_id")
#     faculty_id = request.form.get("faculty_id")
#     file = request.files.get("image")

#     if not session_id or not file:
#         return jsonify({"error": "session_id and image required"}), 400

#     # Save image temporarily
#     save_path = f"uploads/{session_id}_{faculty_id}.jpg"
#     file.save(save_path)

#     # Load session students from DB
#     session = db.session.get(ClassSession, session_id)
#     students = Student.query.filter_by(class_id=session.class_id).all()

#     # OCR
#     # reader = easyocr.Reader(['en'])
#     # image = Image.open(save_path)
#     # result = reader.readtext(np.array(image), detail=0)

#     # text_block = "\n".join(result)

#     # output = []
#     # for s in students:

#     #     roll_match = str(s.roll_no) in text_block
#     #     name_match = process.extractOne(
#     #         s.name, text_block.split("\n"), scorer=fuzz.token_set_ratio
#     #     )

#     #     name_ok = name_match and name_match[1] > 70

#     #     present = roll_match or name_ok

#     #     output.append({
#     #         "student_id": s.id,
#     #         "roll_no": s.roll_no,
#     #         "name": s.name,
#     #         "status": "present" if present else "absent"
#     #     })

#     # return jsonify({
#     #     "session_id": session_id,
#     #     "results": output
#     # })


# import cv2
# import numpy as np
# from paddleocr import PaddleOCR
# from flask import request, jsonify
# import tempfile
# import pytz
# import os

# ocr = PaddleOCR(lang='en')

# @app.route("/api/attendance/photo-extract", methods=["POST"])
# def extract_attendance_from_photo():
#     # Step 1: GET FILE
#     if "file" not in request.files:
#         return jsonify({"error": "Image file is required"}), 400

#     file = request.files["file"]

#     # Save temp image
#     temp_path = tempfile.mktemp(suffix=".png")
#     file.save(temp_path)

#     # Load image
#     img = cv2.imread(temp_path)

#     # ------------------------------
#     # STEP 2: TABLE GRID DETECTION
#     # ------------------------------
#     gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
#     blur = cv2.GaussianBlur(gray, (3,3), 0)
#     thresh = cv2.adaptiveThreshold(blur, 255, 
#                                    cv2.ADAPTIVE_THRESH_MEAN_C,
#                                    cv2.THRESH_BINARY_INV, 15, 4)

#     # Horizontal lines
#     horizontal = thresh.copy()
#     horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (50,1))
#     horizontal = cv2.morphologyEx(horizontal, cv2.MORPH_OPEN, horiz_kernel)

#     # Vertical lines
#     vertical = thresh.copy()
#     vert_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1,50))
#     vertical = cv2.morphologyEx(vertical, cv2.MORPH_OPEN, vert_kernel)

#     # Combine table lines
#     table_mask = cv2.add(horizontal, vertical)

#     # Find contours (cells)
#     contours, _ = cv2.findContours(table_mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

#     # Filter valid cells
#     cells = []
#     for cnt in contours:
#         x, y, w, h = cv2.boundingRect(cnt)
#         if w > 40 and h > 20:
#             cells.append((x, y, w, h))

#     # Sort top to bottom, left to right
#     cells = sorted(cells, key=lambda b: (b[1], b[0]))

#     # -------------------------------------------------
#     # STEP 3: OCR row labels (roll_no + name)
#     # -------------------------------------------------
#     rows = []
#     for (x, y, w, h) in cells:
#         crop = img[y:y+h, x:x+w]

#         # Skip small cells
#         if w < 200:  
#             continue

#         result = ocr.ocr(crop, cls=True)
#         text = ""
#         for line in result:
#             text += " ".join([word[1][0] for word in line]) + " "

#         # Find roll_no and name
#         if any(char.isdigit() for char in text):
#             rows.append({
#                 "row_y": y,
#                 "full": text.strip()
#             })

#     # -------------------------------------------------
#     # STEP 4: Extract attendance from right-side cells
#     # -------------------------------------------------
#     attendance_dict = {}  # { "2023101001001": { "1": "present", "2": "absent" } }

#     for student in rows:
#         roll_no = None
#         name = None
#         parts = student["full"].split()

#         # Extract roll_no
#         for p in parts:
#             if p.isdigit() and len(p) >= 10:
#                 roll_no = p

#         if not roll_no:
#             continue

#         attendance_dict[roll_no] = {}

#     # Now detect ticks (✓)
#     for (x, y, w, h) in cells:
#         crop = img[y:y+h, x:x+w]

#         # Detect tick (simple threshold)
#         crop_gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
#         _, th = cv2.threshold(crop_gray, 150, 255, cv2.THRESH_BINARY_INV)
#         nonzero = cv2.countNonZero(th)

#         if nonzero < 50:
#             continue  # ignore empty cells

#         # Map cell row → student
#         student_row = min(rows, key=lambda r: abs(r["row_y"] - y))
#         roll = [p for p in student_row["full"].split() if p.isdigit()][0]

#         # Map cell column → date index
#         date_index = int((x / 50))  # approximate: 1 cell = 50px

#         attendance_dict[roll][date_index] = "present"

#     return jsonify(attendance_dict)



# ========================================
# ADMIN: Student OD Request Review (Student -> Admin -> Faculty flow)
# ========================================

@app.route("/api/admin/od/pending-requests", methods=["GET"])
@cache_response(timeout=120)
def get_admin_pending_od_requests():
    """
    Get all pending StudentODRequests for admin to review/approve.
    Returns student-initiated OD requests with status=PENDING.
    """
    pending = StudentODRequest.query.filter_by(status=ODRequestStatus.PENDING).order_by(
        StudentODRequest.requested_at.asc()
    ).all()
    
    result = []
    for req in pending:
        student = req.student
        class_ref = req.class_ref
        result.append({
            "id": req.id,
            "student_id": req.student_id,
            "student_name": student.name if student else None,
            "roll_no": student.roll_no if student else None,
            "class_id": req.class_id,
            "class_info": f"{class_ref.department} Yr{class_ref.year} Sec {class_ref.section}" if class_ref else None,
            "from_date": req.from_date.isoformat(),
            "to_date": req.to_date.isoformat(),
            "reason": req.reason,
            "supporting_document": req.supporting_document,
            "requested_at": req.requested_at.isoformat() if req.requested_at else None,
        })
    return jsonify(result)


@app.route("/api/admin/od/approve-request/<int:request_id>", methods=["POST"])
def admin_approve_student_od_request(request_id):
    """
    Admin approves a StudentODRequest. Creates ApprovedODRequest(s) for each date
    in the range (from_date to to_date), which faculty can then apply to attendance.
    """
    clear_api_cache()
    data = request.get_json() or {}
    admin_user_id = data.get("approved_by")
    if not admin_user_id:
        return jsonify({"error": "approved_by (admin user id) is required"}), 400
    
    req = db.session.get(StudentODRequest, request_id)
    if not req:
        return jsonify({"error": "OD request not found"}), 404
    if req.status != ODRequestStatus.PENDING:
        return jsonify({"error": f"Request already {req.status.value}"}), 400
    
    try:
        # Create one ApprovedODRequest per date in the range
        current_date = req.from_date
        while current_date <= req.to_date:
            od = ApprovedODRequest(
                student_id=req.student_id,
                class_id=req.class_id,
                session_id=None,
                date=current_date,
                reason=req.reason,
                approved_by=admin_user_id,
                approved_at=datetime.now(IST),
                student_request_id=req.id
            )
            db.session.add(od)
            current_date = current_date + timedelta(days=1)
        
        req.status = ODRequestStatus.APPROVED
        req.reviewed_by = admin_user_id
        req.reviewed_at = datetime.now(IST)
        req.admin_remarks = data.get("remarks", "")
        
        db.session.commit()
        return jsonify({"ok": True, "message": "OD request approved. Faculty can now apply to attendance."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/admin/od/reject-request/<int:request_id>", methods=["POST"])
def admin_reject_student_od_request(request_id):
    """Admin rejects a StudentODRequest."""
    clear_api_cache()
    data = request.get_json() or {}
    admin_user_id = data.get("rejected_by")
    remarks = data.get("remarks", "")
    
    req = db.session.get(StudentODRequest, request_id)
    if not req:
        return jsonify({"error": "OD request not found"}), 404
    if req.status != ODRequestStatus.PENDING:
        return jsonify({"error": f"Request already {req.status.value}"}), 400
    
    try:
        req.status = ODRequestStatus.REJECTED
        req.reviewed_by = admin_user_id
        req.reviewed_at = datetime.now(IST)
        req.admin_remarks = remarks
        db.session.commit()
        return jsonify({"ok": True, "message": "OD request rejected."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/od/approve", methods=["POST"])
def approve_od():
    """
    Payload:
    {
      "student_id": 12,
      "class_id": 3,
      "date": "2025-11-27",
      "session_id": 45,           -- optional
      "reason": "Sports meet",
      "approved_by": 1            -- admin user id
    }
    """
    clear_api_cache()
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    student_id = data.get("student_id")
    class_id = data.get("class_id")
    date_str = data.get("date")
    session_id = data.get("session_id")
    reason = data.get("reason")
    approved_by = data.get("approved_by")

    if not (student_id and class_id and date_str and approved_by):
        return jsonify({"error": "student_id, class_id, date and approved_by are required"}), 400

    try:
        od_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return jsonify({"error": "date must be YYYY-MM-DD"}), 400

    try:
        od = ApprovedODRequest(
            student_id=student_id,
            class_id=class_id,
            session_id=session_id,
            date=od_date,
            reason=reason,
            approved_by=approved_by,
            approved_at=datetime.now(IST)
        )
        db.session.add(od)
        db.session.commit()
        return jsonify({"ok": True, "od_id": od.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


# --- Faculty: list pending OD requests relevant to their classes ---
@app.route("/api/od/pending", methods=["GET"])
@require_faculty
@cache_response(timeout=120)
def get_pending_od():
    """
    Query: ?faculty_id=2
    We'll return pending OD requests for classes that the faculty handles.
    """
    faculty_id = request.args.get("faculty_id", type=int)
    if not faculty_id:
        return jsonify({"error": "faculty_id is required"}), 400

    # Get class ids that this faculty handles (via faculty_subject_class or faculty->class mapping)
    fsc_rows = FacultySubjectClass.query.filter_by(faculty_id=faculty_id).all()
    class_ids = {r.class_id for r in fsc_rows}
    if not class_ids:
        return jsonify([])

    # pending requests for those classes and applied = false
    pending = ApprovedODRequest.query.filter(
        ApprovedODRequest.class_id.in_(list(class_ids)),
        ApprovedODRequest.applied == False
    ).all()

    result = []
    for p in pending:
        supporting_document = p.student_request.supporting_document if p.student_request else None
        result.append({
            "id": p.id,
            "student_id": p.student_id,
            "student_name": p.student.name if p.student else None,
            "class_id": p.class_id,
            "session_id": p.session_id,
            "date": p.date.isoformat(),
            "reason": p.reason,
            "student_request_id": p.student_request_id,
            "supporting_document": supporting_document,
            "approved_by": p.approved_by,
            "approved_at": p.approved_at.isoformat() if p.approved_at else None
        })
    return jsonify(result)

@app.route("/api/od/apply/<int:od_id>", methods=["PUT"])
@require_faculty
def apply_od(od_id):
    """
    Faculty clicks 'Apply' on a pending OD request.
    Payload: { "faculty_id": 2 } - Faculty table id; we use faculty.user_id for marked_by (Attendance expects users.id)
    """
    clear_api_cache()
    data = request.get_json() or {}
    faculty_id = data.get("faculty_id")
    if not faculty_id:
        return jsonify({"error": "faculty_id is required in payload"}), 400

    faculty = db.session.get(Faculty, faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found"}), 404
    # Attendance.marked_by and applied_by expect user_id (FK to users), not faculty_id
    user_id = faculty.user_id

    od = ApprovedODRequest.query.get_or_404(od_id)
    if od.applied:
        return jsonify({"error": "OD already applied"}), 400

    try:
        # Prefer session-specific update if session_id provided
        if od.session_id:
            # Find the attendance record for this (session, student)
            att = Attendance.query.filter_by(session_id=od.session_id, student_id=od.student_id).first()
            if att:
                prev = att.status.value
                att.status = AttendanceStatus.OD
                att.marked_by = user_id
                att.marked_at = datetime.now(IST)
                att.reason = od.reason
                db.session.add(AttendanceLog(
                    attendance_id=att.id,
                    prev_status=prev,
                    new_status=AttendanceStatus.OD.value,
                    changed_by=user_id,
                    changed_at=datetime.now(IST),
                    note="OD applied by faculty"
                ))
            else:
                # create an attendance record with OD
                new_att = Attendance(
                    session_id=od.session_id,
                    student_id=od.student_id,
                    status=AttendanceStatus.OD,
                    marked_by=user_id,
                    marked_at=datetime.now(IST),
                    reason=od.reason
                )
                db.session.add(new_att)
                db.session.flush()
                db.session.add(AttendanceLog(
                    attendance_id=new_att.id,
                    prev_status=None,
                    new_status=AttendanceStatus.OD.value,
                    changed_by=user_id,
                    changed_at=datetime.now(IST),
                    note="OD applied (new record) by faculty"
                ))
        else:
            # No explicit session: find ClassSession(s) for that class on od.date and update student's attendance
            sessions = ClassSession.query.filter_by(class_id=od.class_id, date=od.date).all()
            if not sessions:
                # No session exists (maybe holiday). We'll create a dummy / no-op — but record applied.
                pass
            for s in sessions:
                att = Attendance.query.filter_by(session_id=s.id, student_id=od.student_id).first()
                if att:
                    prev = att.status.value
                    # If already present, keep present. If absent -> set to OD
                    if prev != AttendanceStatus.PRESENT.value:
                        att.status = AttendanceStatus.OD
                        att.marked_by = user_id
                        att.marked_at = datetime.now(IST)
                        att.reason = od.reason
                        db.session.add(AttendanceLog(
                            attendance_id=att.id,
                            prev_status=prev,
                            new_status=AttendanceStatus.OD.value,
                            changed_by=user_id,
                            changed_at=datetime.now(IST),
                            note="OD applied by faculty"
                        ))
                else:
                    # create attendance record for this session as OD
                    new_att = Attendance(
                        session_id=s.id,
                        student_id=od.student_id,
                        status=AttendanceStatus.OD,
                        marked_by=user_id,
                        marked_at=datetime.now(IST),
                        reason=od.reason
                    )
                    db.session.add(new_att)
                    db.session.flush()
                    db.session.add(AttendanceLog(
                        attendance_id=new_att.id,
                        prev_status=None,
                        new_status=AttendanceStatus.OD.value,
                        changed_by=user_id,
                        changed_at=datetime.now(IST),
                        note="OD applied (new record) by faculty"
                    ))

        # mark request as applied
        od.applied = True
        od.applied_by = user_id
        od.applied_at = datetime.now(IST)
        db.session.commit()
        return jsonify({"ok": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400# ========================================
# STUDENT-SPECIFIC ENDPOINTS
# ========================================

@app.route("/api/student/attendance/summary", methods=["GET"])
@cache_response(timeout=180)
def get_student_attendance_summary():
    """
    Get attendance summary for a student
    Query params: student_id (required)
    Returns: overall attendance percentage, present/absent/od counts
    """
    student_id = request.args.get("student_id", type=int)
    
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400
    
    # Get student info
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    
    # Get all attendance records for this student
    attendance_records = Attendance.query.filter_by(student_id=student_id).all()
    
    total = len(attendance_records)
    present = sum(1 for a in attendance_records if a.status == AttendanceStatus.PRESENT)
    absent = sum(1 for a in attendance_records if a.status == AttendanceStatus.ABSENT)
    od = sum(1 for a in attendance_records if a.status == AttendanceStatus.OD)
    
    # Calculate percentage (present + od counted as present)
    percentage = round(((present + od) / total * 100), 2) if total > 0 else 0
    
    # Get subject-wise breakdown
    subject_attendance = {}
    for record in attendance_records:
        subject_id = record.session.subject_id
        subject_name = record.session.subject.name
        
        if subject_id not in subject_attendance:
            subject_attendance[subject_id] = {
                "subject_id": subject_id,
                "subject_name": subject_name,
                "total": 0,
                "present": 0,
                "absent": 0,
                "od": 0
            }
        
        subject_attendance[subject_id]["total"] += 1
        if record.status == AttendanceStatus.PRESENT:
            subject_attendance[subject_id]["present"] += 1
        elif record.status == AttendanceStatus.ABSENT:
            subject_attendance[subject_id]["absent"] += 1
        elif record.status == AttendanceStatus.OD:
            subject_attendance[subject_id]["od"] += 1
    
    # Calculate percentage for each subject
    for subject_id in subject_attendance:
        s = subject_attendance[subject_id]
        s["percentage"] = round(((s["present"] + s["od"]) / s["total"] * 100), 2) if s["total"] > 0 else 0
    
    return jsonify({
        "student_id": student_id,
        "student_name": student.name,
        "roll_no": student.roll_no,
        "overall": {
            "total": total,
            "present": present,
            "absent": absent,
            "od": od,
            "percentage": percentage
        },
        "by_subject": list(subject_attendance.values())
    })


# @app.route("/api/student/sessions/upcoming", methods=["GET"])
# def get_student_upcoming_sessions():
#     """
#     Get upcoming class sessions for a student
#     Query params: student_id (required), days (optional, default 7)
#     """
#     student_id = request.args.get("student_id", type=int)
#     days = request.args.get("days", type=int, default=7)
    
#     if not student_id:
#         return jsonify({"error": "student_id is required"}), 400
    
#     # Get student's class
#     student = db.session.get(Student, student_id)
#     if not student:
#         return jsonify({"error": "Student not found"}), 404
    
#     class_id = student.class_id
#     if not class_id:
#         return jsonify([])
    
#     # Get upcoming sessions for this class
#     today = datetime.now(IST).date()
#     end_date = today + timedelta(days=days)
    
#     sessions = ClassSession.query.filter(
#         ClassSession.class_id == class_id,
#         ClassSession.date >= today,
#         ClassSession.date <= end_date
#     ).order_by(ClassSession.date.asc(), ClassSession.start_time.asc()).all()
    
#     result = []
#     for s in sessions:
#         # Check if attendance already marked
#         attendance = Attendance.query.filter_by(
#             session_id=s.id,
#             student_id=student_id
#         ).first()
        
#         result.append({
#             "session_id": s.id,
#             "subject_id": s.subject_id,
#             "subject_name": s.subject.name,
#             "faculty_name": s.faculty.user.name,
#             "date": s.date.isoformat(),
#             "start_time": s.start_time.isoformat() if s.start_time else None,
#             "end_time": s.end_time.isoformat() if s.end_time else None,
#             "topic": s.topic,
#             "attendance_status": attendance.status.value if attendance else None
#         })
    
#     return jsonify(result)


@app.route("/api/student/od/my-requests", methods=["GET"])
@cache_response(timeout=120)
def get_student_od_requests():
    """
    Get all OD requests submitted by a student
    Query params: student_id (required)
    """
    student_id = request.args.get("student_id", type=int)
    
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400
    
    # Get all OD requests for this student from StudentODRequest table
    od_requests = StudentODRequest.query.filter_by(student_id=student_id).order_by(
        StudentODRequest.requested_at.desc()
    ).all()
    
    result = []
    for req in od_requests:
        result.append({
            "id": req.id,
            "student_id": req.student_id,
            "date": req.from_date.isoformat(),
            "from_date": req.from_date.isoformat(),
            "to_date": req.to_date.isoformat(),
            "reason": req.reason,
            "supporting_document": req.supporting_document,
            "status": req.status.value,
            "created_at": req.requested_at.isoformat() if req.requested_at else None,
            "reviewed_by": req.reviewed_by,
            "reviewed_at": req.reviewed_at.isoformat() if req.reviewed_at else None,
            "admin_notes": req.admin_remarks
        })
    
    return jsonify(result)


@app.route("/api/student/od/submit", methods=["POST"])
def submit_student_od_request():
    """
    Submit a new OD request
    Payload:
    {
      "student_id": 12,
      "from_date": "2025-02-15",
      "to_date": "2025-02-16",   // optional, defaults to from_date
      "reason": "Sports meet"
    }
    """
    clear_api_cache()
    data = request.get_json(silent=True)

    if data is None:
        # For FormData, extract only the form fields we need
        data = {
            "student_id": request.form.get("student_id"),
            "from_date": request.form.get("from_date"),
            "to_date": request.form.get("to_date"),
            "reason": request.form.get("reason")
        }
    
    if not data or not any([data.get("student_id"), data.get("from_date")]):
        return jsonify({"error": "No data provided"}), 400
    
    student_id = data.get("student_id")
    from_date_str = data.get("from_date") or data.get("date")
    to_date_str = data.get("to_date") or from_date_str
    reason = data.get("reason")
    supporting_document_path = None
    
    if not (student_id and from_date_str and reason):
        return jsonify({"error": "student_id, from_date, and reason are required"}), 400
    
    try:
        from_date = datetime.strptime(from_date_str, "%Y-%m-%d").date()
        to_date = datetime.strptime(to_date_str, "%Y-%m-%d").date()
    except Exception:
        return jsonify({"error": "Dates must be YYYY-MM-DD"}), 400
    
    if to_date < from_date:
        return jsonify({"error": "to_date cannot be before from_date"}), 400

    uploaded_file = request.files.get("supporting_document")
    if uploaded_file and uploaded_file.filename:
        allowed_extensions = {"pdf", "png", "jpg", "jpeg", "doc", "docx"}
        ext = uploaded_file.filename.rsplit(".", 1)[-1].lower() if "." in uploaded_file.filename else ""
        if ext not in allowed_extensions:
            return jsonify({"error": "Unsupported file type. Allowed: pdf, png, jpg, jpeg, doc, docx"}), 400

        upload_dir = os.path.join(app.root_path, "uploads", "od_documents")
        os.makedirs(upload_dir, exist_ok=True)

        safe_name = secure_filename(uploaded_file.filename)
        file_name = f"{uuid4().hex}_{safe_name}"
        save_path = os.path.join(upload_dir, file_name)
        uploaded_file.save(save_path)
        supporting_document_path = os.path.join("uploads", "od_documents", file_name).replace("\\", "/")
    
    # Get student's class_id (required for StudentODRequest)
    student = db.session.get(Student, student_id)
    if not student or not student.class_id:
        return jsonify({"error": "Student or class not found"}), 400
    
    try:
        od_request = StudentODRequest(
            student_id=student_id,
            class_id=student.class_id,
            from_date=from_date,
            to_date=to_date,
            reason=reason,
            supporting_document=supporting_document_path,
            status=ODRequestStatus.PENDING
        )
        db.session.add(od_request)
        db.session.commit()
        
        return jsonify({
            "ok": True,
            "request_id": od_request.id,
            "message": "OD request submitted successfully"
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/student/od/cancel/<int:request_id>", methods=["PUT"])
def cancel_student_od_request(request_id):
    """Student cancels their own PENDING OD request."""
    clear_api_cache()
    data = request.get_json() or {}
    student_id = data.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400
    
    req = db.session.get(StudentODRequest, request_id)
    if not req:
        return jsonify({"error": "OD request not found"}), 404
    if req.student_id != int(student_id):
        return jsonify({"error": "Not authorized to cancel this request"}), 403
    if req.status != ODRequestStatus.PENDING:
        return jsonify({"error": f"Cannot cancel - request already {req.status.value}"}), 400
    
    try:
        req.status = ODRequestStatus.CANCELLED
        db.session.commit()
        return jsonify({"ok": True, "message": "OD request cancelled"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/student/od/document/<int:request_id>", methods=["GET"])
def get_od_document(request_id):
    """Serve the supporting document for an OD request"""
    req = db.session.get(StudentODRequest, request_id)
    if not req:
        return jsonify({"error": "OD request not found"}), 404
    
    if not req.supporting_document:
        return jsonify({"error": "No document attached to this request"}), 404
    
    file_path = os.path.join(app.root_path, req.supporting_document)
    
    if not os.path.exists(file_path):
        return jsonify({"error": "Document file not found"}), 404
    
    try:
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========================================
# FACULTY DASHBOARD ENDPOINTS
# ========================================

@app.route("/api/faculty/<int:faculty_id>/dashboard/summary", methods=["GET"])
@require_faculty
@cache_response(timeout=120)
def get_faculty_dashboard_summary(faculty_id):
    """
    Get faculty dashboard summary: today's classes, overall attendance, defaulters, pending
    """
    try:
        faculty = db.session.get(Faculty, faculty_id)
        if not faculty:
            return jsonify({"error": "Faculty not found"}), 404
        
        today = datetime.now(IST).date()
        
        # Get classes this faculty handles
        fsc_rows = FacultySubjectClass.query.filter_by(faculty_id=faculty_id).all()
        class_ids = {r.class_id for r in fsc_rows}
        
        if not class_ids:
            return jsonify({
                "todays_classes": 0,
                "overall_attendance": 0,
                "total_defaulters": 0,
                "pending_attendance": 0
            })
        
        # Today's classes
        todays_sessions = ClassSession.query.filter(
            ClassSession.class_id.in_(list(class_ids)),
            ClassSession.date == today
        ).count()
        
        # Overall attendance
        all_attendance = Attendance.query.join(ClassSession).filter(
            ClassSession.class_id.in_(list(class_ids))
        ).all()
        
        if all_attendance:
            present_count = sum(1 for a in all_attendance if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.OD])
            overall_attendance = round((present_count / len(all_attendance)) * 100, 2)
        else:
            overall_attendance = 0
        
        # Total defaulters (students below 75%)
        students = Student.query.filter(Student.class_id.in_(list(class_ids))).all()
        defaulters = 0
        
        for student in students:
            student_attendance = Attendance.query.join(ClassSession).filter(
                Attendance.student_id == student.id,
                ClassSession.class_id.in_(list(class_ids))
            ).all()
            
            if student_attendance:
                present = sum(1 for a in student_attendance if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.OD])
                percentage = (present / len(student_attendance)) * 100
                if percentage < 75:
                    defaulters += 1
        
        # Pending attendance (sessions today without marked attendance)
        marked_sessions_today = Attendance.query.join(ClassSession).filter(
            ClassSession.class_id.in_(list(class_ids)),
            ClassSession.date == today
        ).count()
        
        pending = max(0, todays_sessions - (marked_sessions_today if marked_sessions_today else 0))
        
        return jsonify({
            "todays_classes": todays_sessions,
            "overall_attendance": overall_attendance,
            "total_defaulters": defaulters,
            "pending_attendance": pending
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/faculty/<int:faculty_id>/dashboard/alerts", methods=["GET"])
@require_faculty
@cache_response(timeout=300)
def get_faculty_course_alerts(faculty_id):
    """
    Get course-wise low attendance alerts (courses with students below 75%)
    """
    try:
        # Get classes this faculty handles
        fsc_rows = FacultySubjectClass.query.filter_by(faculty_id=faculty_id).all()
        
        alerts = []
        
        for fsc in fsc_rows:
            class_data = db.session.get(Class, fsc.class_id)
            subject = db.session.get(Subject, fsc.subject_id)
            
            if not class_data or not subject:
                continue
            
            # Get all students in this class
            students = Student.query.filter_by(class_id=fsc.class_id).all()
            
            defaulter_count = 0
            for student in students:
                student_attendance = Attendance.query.join(ClassSession).filter(
                    Attendance.student_id == student.id,
                    ClassSession.subject_id == fsc.subject_id
                ).all()
                
                if student_attendance:
                    present = sum(1 for a in student_attendance if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.OD])
                    percentage = (present / len(student_attendance)) * 100
                    if percentage < 75:
                        defaulter_count += 1
            
            if defaulter_count > 0:
                alerts.append({
                    "class_id": fsc.class_id,
                    "subject_id": fsc.subject_id,
                    "subject_name": subject.name,
                    "department": class_data.department,
                    "year": class_data.year,
                    "section": class_data.section,
                    "defaulter_count": defaulter_count
                })
        
        return jsonify(alerts)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/faculty/<int:faculty_id>/dashboard/weekly-trend", methods=["GET"])
@require_faculty
@cache_response(timeout=300)
def get_faculty_weekly_trend(faculty_id):
    """
    Get weekly attendance trend (last 7 days)
    """
    try:
        fsc_rows = FacultySubjectClass.query.filter_by(faculty_id=faculty_id).all()
        class_ids = {r.class_id for r in fsc_rows}
        
        if not class_ids:
            return jsonify([])
        
        # Get last 7 days
        today = datetime.now(IST).date()
        trend = []
        
        for i in range(6, -1, -1):
            day_date = today - timedelta(days=i)
            day_name = day_date.strftime('%A')
            
            # Get attendance for this day
            day_attendance = Attendance.query.join(ClassSession).filter(
                ClassSession.class_id.in_(list(class_ids)),
                ClassSession.date == day_date
            ).all()
            
            if day_attendance:
                present = sum(1 for a in day_attendance if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.OD])
                average = (present / len(day_attendance)) * 100
            else:
                average = 0
            
            trend.append({
                "day": day_name[:3],
                "average": average
            })
        
        return jsonify(trend)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/faculty/<int:faculty_id>/dashboard/course-comparison", methods=["GET"])
@require_faculty
@cache_response(timeout=300)
def get_faculty_course_comparison(faculty_id):
    """
    Get course-wise attendance comparison
    """
    try:
        fsc_rows = FacultySubjectClass.query.filter_by(faculty_id=faculty_id).all()
        
        comparison = []
        
        for fsc in fsc_rows:
            subject = db.session.get(Subject, fsc.subject_id)
            
            if not subject:
                continue
            
            # Get all attendance records for this subject
            subject_attendance = Attendance.query.join(ClassSession).filter(
                ClassSession.subject_id == fsc.subject_id,
                ClassSession.faculty_id == faculty_id
            ).all()
            
            if subject_attendance:
                present_count = sum(1 for a in subject_attendance if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.OD])
                avg_attendance = (present_count / len(subject_attendance)) * 100
                total_sessions = len(subject_attendance)
            else:
                present_count = 0
                avg_attendance = 0
                total_sessions = 0
            
            comparison.append({
                "subject_id": fsc.subject_id,
                "subject_name": subject.name,
                "avg_attendance": avg_attendance,
                "present_count": present_count,
                "total_sessions": total_sessions
            })
        
        # Sort by attendance
        comparison.sort(key=lambda x: x['avg_attendance'], reverse=True)
        
        return jsonify(comparison)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/faculty/<int:faculty_id>/dashboard/course-defaulters", methods=["GET"])
@require_faculty
def get_faculty_course_defaulters(faculty_id):
    """
    Get students below 75% in a specific course
    Query params: class_id, subject_id
    """
    try:
        class_id = request.args.get("class_id", type=int)
        subject_id = request.args.get("subject_id", type=int)
        
        if not class_id or not subject_id:
            return jsonify({"error": "class_id and subject_id are required"}), 400
        
        # Get all students in this class
        students = Student.query.filter_by(class_id=class_id).all()
        
        defaulters = []
        
        for student in students:
            student_attendance = Attendance.query.join(ClassSession).filter(
                Attendance.student_id == student.id,
                ClassSession.subject_id == subject_id
            ).all()
            
            if student_attendance:
                present = sum(1 for a in student_attendance if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.OD])
                percentage = (present / len(student_attendance)) * 100
                
                if percentage < 75:
                    defaulters.append({
                        "name": student.name,
                        "roll_no": student.roll_no,
                        "attendance_percentage": percentage
                    })
        
        # Sort by attendance
        defaulters.sort(key=lambda x: x['attendance_percentage'])
        
        return jsonify(defaulters)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ========================================
# ADMIN DASHBOARD ENDPOINTS
# ========================================

@app.route("/api/admin/dashboard/summary", methods=["GET"])
@cache_response(timeout=120)
def get_admin_dashboard_summary():
    """
    Get admin dashboard KPI summary:
    - Total Students, Total Faculty, College Avg Attendance, Classes Conducted Today
    """
    try:
        today = datetime.now(IST).date()

        total_students = Student.query.count()
        total_faculty = Faculty.query.count()

        # College-wide average attendance
        all_attendance = Attendance.query.all()
        if all_attendance:
            present_count = sum(
                1 for a in all_attendance
                if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.OD]
            )
            college_avg = round((present_count / len(all_attendance)) * 100, 2)
        else:
            college_avg = 0

        # Classes conducted today (sessions that have at least one attendance record)
        todays_sessions = ClassSession.query.filter(ClassSession.date == today).all()
        classes_today = len(todays_sessions)

        return jsonify({
            "total_students": total_students,
            "total_faculty": total_faculty,
            "college_avg_attendance": college_avg,
            "classes_today": classes_today
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/admin/dashboard/department-attendance", methods=["GET"])
@cache_response(timeout=300)
def get_admin_department_attendance():
    """
    Get department-wise attendance for bar chart.
    Returns: [{department, avg_attendance, total_students, total_records}]
    """
    try:
        # Get all departments from Classes
        departments = db.session.query(Class.department).distinct().all()
        result = []

        for (dept,) in departments:
            if not dept:
                continue

            # Get all class IDs for this department
            class_ids = [c.id for c in Class.query.filter_by(department=dept).all()]

            if not class_ids:
                continue

            # Get attendance records for this department
            dept_attendance = Attendance.query.join(ClassSession).filter(
                ClassSession.class_id.in_(class_ids)
            ).all()

            student_count = Student.query.filter(Student.class_id.in_(class_ids)).count()

            if dept_attendance:
                present = sum(
                    1 for a in dept_attendance
                    if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.OD]
                )
                avg = round((present / len(dept_attendance)) * 100, 1)
            else:
                avg = 0

            result.append({
                "department": dept,
                "avg_attendance": avg,
                "total_students": student_count,
                "total_records": len(dept_attendance)
            })

        result.sort(key=lambda x: x['department'])
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/admin/dashboard/year-wise-trend", methods=["GET"])
@cache_response(timeout=300)
def get_admin_year_wise_trend():
    """
    Get year-wise attendance trend for line chart.
    Returns: [{year, avg_attendance, total_students}]
    """
    try:
        years = db.session.query(Class.year).distinct().order_by(Class.year).all()
        result = []

        for (year,) in years:
            if not year:
                continue

            class_ids = [c.id for c in Class.query.filter_by(year=year).all()]

            if not class_ids:
                continue

            year_attendance = Attendance.query.join(ClassSession).filter(
                ClassSession.class_id.in_(class_ids)
            ).all()

            student_count = Student.query.filter(Student.class_id.in_(class_ids)).count()

            if year_attendance:
                present = sum(
                    1 for a in year_attendance
                    if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.OD]
                )
                avg = round((present / len(year_attendance)) * 100, 1)
            else:
                avg = 0

            result.append({
                "year": year,
                "label": f"Year {year}",
                "avg_attendance": avg,
                "total_students": student_count
            })

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/admin/dashboard/faculty-performance", methods=["GET"])
@cache_response(timeout=300)
def get_admin_faculty_performance():
    """
    Get faculty performance table data.
    Returns: [{faculty_name, department, classes_taken, avg_attendance, missed_entries}]
    """
    try:
        today = datetime.now(IST).date()
        faculties = Faculty.query.all()
        result = []

        for faculty in faculties:
            user = db.session.get(User, faculty.user_id)
            if not user:
                continue

            # Total sessions assigned to this faculty
            total_sessions = ClassSession.query.filter_by(faculty_id=faculty.id).count()

            # Sessions that have attendance marked (at least one record)
            sessions_with_attendance = db.session.query(
                ClassSession.id
            ).join(
                Attendance, Attendance.session_id == ClassSession.id
            ).filter(
                ClassSession.faculty_id == faculty.id
            ).distinct().count()

            # Get attendance records for sessions by this faculty
            faculty_attendance = Attendance.query.join(ClassSession).filter(
                ClassSession.faculty_id == faculty.id
            ).all()

            if faculty_attendance:
                present = sum(
                    1 for a in faculty_attendance
                    if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.OD]
                )
                avg = round((present / len(faculty_attendance)) * 100, 1)
            else:
                avg = 0

            # Missed entries = past sessions with no attendance records
            past_sessions = ClassSession.query.filter(
                ClassSession.faculty_id == faculty.id,
                ClassSession.date < today
            ).count()

            missed = max(0, past_sessions - sessions_with_attendance)

            result.append({
                "faculty_id": faculty.id,
                "faculty_name": user.name,
                "department": faculty.department or "N/A",
                "classes_taken": sessions_with_attendance,
                "total_assigned": total_sessions,
                "avg_attendance": avg,
                "missed_entries": missed
            })

        result.sort(key=lambda x: x['avg_attendance'], reverse=True)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/admin/dashboard/alerts", methods=["GET"])
@cache_response(timeout=300)
def get_admin_dashboard_alerts():
    """
    Get admin alert panel data:
    - Departments below 75% threshold
    - Classes not marked today
    - High defaulter batches (classes with most students below 75%)
    """
    try:
        today = datetime.now(IST).date()

        # 1. Departments below threshold
        departments = db.session.query(Class.department).distinct().all()
        low_departments = []

        for (dept,) in departments:
            if not dept:
                continue
            class_ids = [c.id for c in Class.query.filter_by(department=dept).all()]
            if not class_ids:
                continue

            dept_attendance = Attendance.query.join(ClassSession).filter(
                ClassSession.class_id.in_(class_ids)
            ).all()

            if dept_attendance:
                present = sum(
                    1 for a in dept_attendance
                    if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.OD]
                )
                avg = round((present / len(dept_attendance)) * 100, 1)
                if avg < 75:
                    low_departments.append({"department": dept, "attendance": avg})

        # 2. Classes not marked today
        todays_sessions = ClassSession.query.filter(ClassSession.date == today).all()
        unmarked_classes = []

        for session in todays_sessions:
            has_attendance = Attendance.query.filter_by(session_id=session.id).first()
            if not has_attendance:
                subject = db.session.get(Subject, session.subject_id)
                class_data = db.session.get(Class, session.class_id)
                faculty = db.session.get(Faculty, session.faculty_id)
                faculty_user = db.session.get(User, faculty.user_id) if faculty else None

                unmarked_classes.append({
                    "session_id": session.id,
                    "subject": subject.name if subject else "Unknown",
                    "class": f"{class_data.department} Yr{class_data.year} Sec {class_data.section}" if class_data else "Unknown",
                    "faculty": faculty_user.name if faculty_user else "Unknown",
                    "time": session.start_time.strftime("%H:%M") if session.start_time else "N/A"
                })

        # 3. High defaulter batches
        all_classes = Class.query.all()
        high_defaulter_batches = []

        for cls in all_classes:
            students = Student.query.filter_by(class_id=cls.id).all()
            if not students:
                continue

            defaulter_count = 0
            for student in students:
                student_att = Attendance.query.join(ClassSession).filter(
                    Attendance.student_id == student.id,
                    ClassSession.class_id == cls.id
                ).all()

                if student_att:
                    present = sum(
                        1 for a in student_att
                        if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.OD]
                    )
                    pct = (present / len(student_att)) * 100
                    if pct < 75:
                        defaulter_count += 1

            if defaulter_count > 0:
                high_defaulter_batches.append({
                    "class": f"{cls.department} Yr{cls.year} Sec {cls.section}",
                    "class_id": cls.id,
                    "defaulter_count": defaulter_count,
                    "total_students": len(students),
                    "percentage": round((defaulter_count / len(students)) * 100, 1)
                })

        high_defaulter_batches.sort(key=lambda x: x['defaulter_count'], reverse=True)

        return jsonify({
            "low_departments": low_departments,
            "unmarked_classes": unmarked_classes,
            "high_defaulter_batches": high_defaulter_batches[:10]  # Top 10
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


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
    start_scheduler()
    socketio.run(app, host="127.0.0.1", port=5000, debug=True, use_reloader=False)

