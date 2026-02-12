from datetime import datetime
from enum import Enum
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class UserRole(Enum):
    ADMIN = "ADMIN"
    FACULTY = "FACULTY"
    STUDENT = "STUDENT"

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False)
    
    __table_args__ = (
        db.Index('idx_users_email', 'email'),
        db.Index('idx_users_role', 'role'),
    )

class Student(db.Model):
    __tablename__ = "students"
    id = db.Column(db.Integer, primary_key=True)
    roll_no = db.Column(db.String(64), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    department = db.Column(db.String(100))
    year = db.Column(db.Integer)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)  # NEW: Link to user account

    class_rel = db.relationship("Class", backref="students")
    user = db.relationship("User", backref="student_profile", uselist=False)  # NEW
    
    __table_args__ = (
        db.Index('idx_students_roll_no', 'roll_no'),
        db.Index('idx_students_class', 'class_id'),
        db.Index('idx_students_department', 'department'),
        db.Index('idx_students_user', 'user_id'),  # NEW
    )


class Faculty(db.Model):
    __tablename__ = "faculties"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    department = db.Column(db.String(100))
    user = db.relationship("User", backref="faculty_profile", uselist=False)
    
    __table_args__ = (
        db.Index('idx_faculty_user', 'user_id'),
        db.Index('idx_faculty_department', 'department'),
    )

class Subject(db.Model):
    __tablename__ = "subjects"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    semester = db.Column(db.Integer)
    
    __table_args__ = (
        db.Index('idx_subjects_code', 'code'),
        db.Index('idx_subjects_semester', 'semester'),
    )

class ClassSession(db.Model):
    __tablename__ = "class_sessions"
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculties.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)
    topic = db.Column(db.String(255))
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id"), nullable=False)

    __table_args__ = (
        db.UniqueConstraint('faculty_id', 'subject_id', 'class_id', 'date', 'start_time', 'end_time', 
                           name='uix_session_unique'),
        db.Index('idx_sessions_faculty_date', 'faculty_id', 'date'),
        db.Index('idx_sessions_class_date', 'class_id', 'date'),
        db.Index('idx_sessions_date', 'date'),
    )

    subject = db.relationship("Subject")
    faculty = db.relationship("Faculty")
    class_data = db.relationship("Class", backref="sessions")

class Class(db.Model):
    __tablename__ = "classes"

    id = db.Column(db.Integer, primary_key=True)
    department = db.Column(db.String(100))
    year = db.Column(db.Integer)
    section = db.Column(db.String(10))
    
    __table_args__ = (
        db.Index('idx_classes_dept_year', 'department', 'year'),
    )


class AttendanceStatus(Enum):
    PRESENT = "present"
    ABSENT = "absent"
    OD = "od"

class Attendance(db.Model):
    __tablename__ = "attendance"
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("class_sessions.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    status = db.Column(db.Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.ABSENT)
    marked_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    marked_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    reason = db.Column(db.String(500), nullable=True)
    
    __table_args__ = (
        db.UniqueConstraint('session_id', 'student_id', name='uix_session_student'),
        db.Index('idx_attendance_session', 'session_id'),
        db.Index('idx_attendance_student', 'student_id'),
        db.Index('idx_attendance_status', 'status'),
        db.Index('idx_attendance_marked_at', 'marked_at'),
    )
    
    student = db.relationship("Student")
    session = db.relationship("ClassSession")
    marker = db.relationship("User")

class AttendanceLog(db.Model):
    __tablename__ = "attendance_logs"
    id = db.Column(db.Integer, primary_key=True)
    attendance_id = db.Column(db.Integer, db.ForeignKey("attendance.id"), nullable=False)
    prev_status = db.Column(db.String(50))
    new_status = db.Column(db.String(50))
    changed_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    changed_at = db.Column(db.DateTime(timezone=True))
    note = db.Column(db.String(500))
    attendance = db.relationship("Attendance")
    
    __table_args__ = (
        db.Index('idx_attendance_logs_attendance', 'attendance_id'),
        db.Index('idx_attendance_logs_changed_at', 'changed_at'),
    )

class Timetable(db.Model):
    __tablename__ = "timetables"

    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculties.id"), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)
    day_of_week = db.Column(db.String(10), nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    room = db.Column(db.String(50))

    faculty = db.relationship("Faculty")
    subject = db.relationship("Subject")
    
    __table_args__ = (
        db.Index('idx_timetable_faculty', 'faculty_id'),
        db.Index('idx_timetable_day', 'day_of_week'),
    )

class FacultySubjectClass(db.Model):
    __tablename__ = "faculty_subject_class"

    id = db.Column(db.Integer, primary_key=True)

    faculty_id = db.Column(db.Integer, db.ForeignKey("faculties.id"), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id"), nullable=False)

    faculty = db.relationship("Faculty", backref="subject_classes")
    subject = db.relationship("Subject", backref="faculty_classes")
    class_obj = db.relationship("Class", backref="faculty_subjects")
    
    __table_args__ = (
        db.UniqueConstraint('faculty_id', 'subject_id', 'class_id', name='uix_faculty_subject_class'),
        db.Index('idx_fsc_faculty', 'faculty_id'),
        db.Index('idx_fsc_class', 'class_id'),
    )


# ============================================================================
# NEW: Student OD Request Workflow Tables
# ============================================================================

class ODRequestStatus(Enum):
    """Status of OD request in the workflow"""
    PENDING = "pending"              # Student submitted, waiting for admin
    APPROVED = "approved"            # Admin approved, waiting for faculty to apply
    REJECTED = "rejected"            # Admin rejected
    APPLIED = "applied"              # Faculty applied to attendance
    CANCELLED = "cancelled"          # Student cancelled before approval


class StudentODRequest(db.Model):
    """
    Student-initiated OD requests
    Workflow: Student → Admin → Faculty
    """
    __tablename__ = "student_od_requests"
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id"), nullable=False)
    
    # Date range for OD
    from_date = db.Column(db.Date, nullable=False)
    to_date = db.Column(db.Date, nullable=False)
    
    # Optional: specific sessions (if student knows which sessions they'll miss)
    session_ids = db.Column(db.JSON, nullable=True)  # Array of session IDs
    
    # Request details
    reason = db.Column(db.String(1000), nullable=False)
    supporting_document = db.Column(db.String(500), nullable=True)  # File path/URL
    
    # Status tracking
    status = db.Column(db.Enum(ODRequestStatus), nullable=False, default=ODRequestStatus.PENDING)
    
    # Timestamps
    requested_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Admin review
    reviewed_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    admin_remarks = db.Column(db.String(500), nullable=True)
    
    # Faculty application (links to ApprovedODRequest)
    approved_od_id = db.Column(db.Integer, db.ForeignKey("approved_od_requests.id"), nullable=True)
    
    # Relationships
    student = db.relationship("Student", foreign_keys=[student_id], lazy="joined")
    class_ref = db.relationship("Class", foreign_keys=[class_id], lazy="joined")
    reviewer = db.relationship("User", foreign_keys=[reviewed_by])
    approved_od = db.relationship("ApprovedODRequest", foreign_keys=[approved_od_id])
    
    # Indexes
    __table_args__ = (
        db.Index('idx_student_od_student', 'student_id'),
        db.Index('idx_student_od_status', 'status'),
        db.Index('idx_student_od_dates', 'from_date', 'to_date'),
        db.Index('idx_student_od_class', 'class_id'),
        db.Index('idx_student_od_requested_at', 'requested_at'),
    )


class ApprovedODRequest(db.Model):
    """
    Admin-approved OD requests ready for faculty to apply
    (This is your existing table - keeping it for backward compatibility)
    """
    __tablename__ = "approved_od_requests"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id"), nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey("class_sessions.id"), nullable=True)
    date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.String(500))
    approved_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    approved_at = db.Column(db.DateTime, default=datetime.utcnow)
    applied = db.Column(db.Boolean, default=False)
    applied_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    applied_at = db.Column(db.DateTime, nullable=True)
    
    # NEW: Link back to student request (if it came from student)
    student_request_id = db.Column(db.Integer, db.ForeignKey("student_od_requests.id"), nullable=True)

    student = db.relationship("Student", foreign_keys=[student_id], lazy="joined")
    class_ref = db.relationship("Class", foreign_keys=[class_id], lazy="joined")
    session = db.relationship("ClassSession", foreign_keys=[session_id])
    student_request = db.relationship("StudentODRequest", foreign_keys=[student_request_id], 
                                     backref="approved_requests")
    
    __table_args__ = (
        db.Index('idx_od_student', 'student_id'),
        db.Index('idx_od_class', 'class_id'),
        db.Index('idx_od_date', 'date'),
        db.Index('idx_od_applied', 'applied'),
        db.Index('idx_od_class_date', 'class_id', 'date'),
        db.Index('idx_od_student_request', 'student_request_id'),  # NEW
    )