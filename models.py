from datetime import datetime
from enum import Enum
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class UserRole(Enum):
<<<<<<< HEAD
    ADMIN = "ADMIN"
    FACULTY = "FACULTY"
    STUDENT = "STUDENT"
=======
    ADMIN = "admin"
    FACULTY = "faculty"
    STUDENT = "student"
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    role =  db.Column(db.Enum(UserRole), nullable=False)

class Student(db.Model):
    __tablename__ = "students"
    id = db.Column(db.Integer, primary_key=True)
    roll_no = db.Column(db.String(64), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    department = db.Column(db.String(100))
    year = db.Column(db.Integer)
<<<<<<< HEAD
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id"), nullable=False)

    class_rel = db.relationship("Class", backref="students")

=======
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c

class Faculty(db.Model):
    __tablename__ = "faculties"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    department = db.Column(db.String(100))
    user = db.relationship("User", backref="faculty_profile", uselist=False)

class Subject(db.Model):
    __tablename__ = "subjects"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    semester = db.Column(db.Integer)

class ClassSession(db.Model):
    __tablename__ = "class_sessions"
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculties.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)
    topic = db.Column(db.String(255))
<<<<<<< HEAD
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id"), nullable=False)

    subject = db.relationship("Subject")
    faculty = db.relationship("Faculty")

class Class(db.Model):
    __tablename__ = "classes"

    id = db.Column(db.Integer, primary_key=True)
    department = db.Column(db.String(100))
    year = db.Column(db.Integer)
    section = db.Column(db.String(10))

    sessions = db.relationship("ClassSession", backref="class_data", lazy=True)



=======
    subject = db.relationship("Subject")
    faculty = db.relationship("Faculty")

>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
class AttendanceStatus(Enum):
    PRESENT = "present"
    ABSENT = "absent"

class Attendance(db.Model):
    __tablename__ = "attendance"
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("class_sessions.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    status = db.Column(db.Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.ABSENT)
    marked_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    marked_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    reason = db.Column(db.String(500), nullable=True)
    __table_args__ = (db.UniqueConstraint('session_id', 'student_id', name='uix_session_student'),)
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
<<<<<<< HEAD
    changed_at = db.Column(db.DateTime(timezone=True))
    note = db.Column(db.String(500))
    attendance = db.relationship("Attendance")

class Timetable(db.Model):
    __tablename__ = "timetables"

    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculties.id"), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)
    #class_id = db.Column(db.Integer, db.ForeignKey("classes.id"), nullable=False)
    day_of_week = db.Column(db.String(10), nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    room = db.Column(db.String(50))

    faculty = db.relationship("Faculty")
    subject = db.relationship("Subject")

class FacultySubjectClass(db.Model):
    __tablename__ = "faculty_subject_class"

    id = db.Column(db.Integer, primary_key=True)

    faculty_id = db.Column(db.Integer, db.ForeignKey("faculties.id"), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id"), nullable=False)

    # Relationships
    faculty = db.relationship("Faculty", backref="subject_classes")
    subject = db.relationship("Subject", backref="faculty_classes")
    class_obj = db.relationship("Class", backref="faculty_subjects")
=======
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)
    note = db.Column(db.String(500))
    attendance = db.relationship("Attendance")
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
