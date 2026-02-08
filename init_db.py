<<<<<<< HEAD
# #!/usr/bin/env python3
# """
# Database initialization script for the Attendance System
# Run this script to create tables and populate with sample data
# """

# from app import app, db, socketio
# from models import User, Student, Faculty, Subject, ClassSession, Attendance, AttendanceLog, AttendanceStatus, UserRole
# from datetime import datetime, date, time
# import os

# def init_database():
#     """Initialize database with tables and sample data"""
    
#     with app.app_context():
#         # Create all tables
#         print("Creating database tables...")
#         db.create_all()
#         print("✓ Tables created successfully")
        
#         # Check if data already exists
#         if User.query.first():
#             print("Database already contains data. Skipping sample data creation.")
#             return
        
#         print("Adding sample data...")
        
#         # Create sample users
#         users_data = [
#             {"email": "admin@college.edu", "name": "Admin User", "role": UserRole.ADMIN},
#             {"email": "john.doe@college.edu", "name": "Dr. John Doe", "role": UserRole.FACULTY},
#             {"email": "jane.smith@college.edu", "name": "Prof. Jane Smith", "role": UserRole.FACULTY},
#             {"email": "mike.wilson@college.edu", "name": "Dr. Mike Wilson", "role": UserRole.FACULTY},
#         ]
        
#         users = []
#         for user_data in users_data:
#             user = User(**user_data)
#             db.session.add(user)
#             users.append(user)
        
#         db.session.flush()  # Get IDs
        
#         # Create sample faculty
#         faculty_data = [
#             {"user_id": users[1].id, "department": "Computer Science"},
#             {"user_id": users[2].id, "department": "Mathematics"},
#             {"user_id": users[3].id, "department": "Physics"},
#         ]
        
#         faculty = []
#         for faculty_data_item in faculty_data:
#             faculty_member = Faculty(**faculty_data_item)
#             db.session.add(faculty_member)
#             faculty.append(faculty_member)
        
#         db.session.flush()
        
#         # Create sample students
#         students_data = [
#             {"roll_no": "CS101", "name": "Aarav Kumar", "department": "Computer Science", "year": 2024},
#             {"roll_no": "CS102", "name": "Priya Sharma", "department": "Computer Science", "year": 2024},
#             {"roll_no": "CS103", "name": "Arjun Patel", "department": "Computer Science", "year": 2024},
#             {"roll_no": "CS104", "name": "Ananya Singh", "department": "Computer Science", "year": 2024},
#             {"roll_no": "CS105", "name": "Rohan Gupta", "department": "Computer Science", "year": 2024},
#             {"roll_no": "CS106", "name": "Diya Reddy", "department": "Computer Science", "year": 2024},
#             {"roll_no": "CS107", "name": "Vikram Menon", "department": "Computer Science", "year": 2024},
#             {"roll_no": "CS108", "name": "Ishita Rao", "department": "Computer Science", "year": 2024},
#             {"roll_no": "CS109", "name": "Aditya Nair", "department": "Computer Science", "year": 2024},
#             {"roll_no": "CS110", "name": "Kavya Iyer", "department": "Computer Science", "year": 2024},
#             {"roll_no": "MATH101", "name": "Rajesh Kumar", "department": "Mathematics", "year": 2024},
#             {"roll_no": "MATH102", "name": "Sneha Patel", "department": "Mathematics", "year": 2024},
#             {"roll_no": "PHY101", "name": "Amit Singh", "department": "Physics", "year": 2024},
#             {"roll_no": "PHY102", "name": "Pooja Sharma", "department": "Physics", "year": 2024},
#         ]
        
#         students = []
#         for student_data in students_data:
#             student = Student(**student_data)
#             db.session.add(student)
#             students.append(student)
        
#         db.session.flush()
        
#         # Create sample subjects
#         subjects_data = [
#             {"code": "CS101", "name": "Data Structures and Algorithms", "semester": 3},
#             {"code": "CS102", "name": "Database Management Systems", "semester": 4},
#             {"code": "CS103", "name": "Computer Networks", "semester": 5},
#             {"code": "MATH101", "name": "Calculus", "semester": 1},
#             {"code": "MATH102", "name": "Linear Algebra", "semester": 2},
#             {"code": "PHY101", "name": "Mechanics", "semester": 1},
#             {"code": "PHY102", "name": "Electromagnetism", "semester": 2},
#         ]
        
#         subjects = []
#         for subject_data in subjects_data:
#             subject = Subject(**subject_data)
#             db.session.add(subject)
#             subjects.append(subject)
        
#         db.session.flush()
        
#         # Create sample class sessions
#         today = date.today()
#         sessions_data = [
#             {
#                 "subject_id": subjects[0].id,  # Data Structures
#                 "faculty_id": faculty[0].id,   # Dr. John Doe
#                 "date": today,
#                 "start_time": time(9, 0),
#                 "end_time": time(10, 30),
#                 "topic": "Introduction to Trees"
#             },
#             {
#                 "subject_id": subjects[1].id,  # Database Management
#                 "faculty_id": faculty[0].id,   # Dr. John Doe
#                 "date": today,
#                 "start_time": time(11, 0),
#                 "end_time": time(12, 30),
#                 "topic": "SQL Queries and Joins"
#             },
#             {
#                 "subject_id": subjects[3].id,  # Calculus
#                 "faculty_id": faculty[1].id,   # Prof. Jane Smith
#                 "date": today,
#                 "start_time": time(14, 0),
#                 "end_time": time(15, 30),
#                 "topic": "Integration Techniques"
#             },
#         ]
        
#         sessions = []
#         for session_data in sessions_data:
#             session = ClassSession(**session_data)
#             db.session.add(session)
#             sessions.append(session)
        
#         db.session.flush()
        
#         # Create sample attendance records
#         # For the first session (Data Structures), mark some students present
#         cs_students = [s for s in students if s.department == "Computer Science"][:10]
        
#         for i, student in enumerate(cs_students):
#             status = AttendanceStatus.PRESENT if i < 7 else AttendanceStatus.ABSENT  # 7 present, 3 absent
#             attendance = Attendance(
#                 session_id=sessions[0].id,
#                 student_id=student.id,
#                 status=status,
#                 marked_by=users[1].id,  # Dr. John Doe
#                 marked_at=datetime.utcnow(),
#                 reason=None if status == AttendanceStatus.PRESENT else "Not present in class"
#             )
#             db.session.add(attendance)
            
#             # Create attendance log
#             log = AttendanceLog(
#                 attendance_id=attendance.id,
#                 prev_status=None,
#                 new_status=status.value,
#                 changed_by=users[1].id,
#                 changed_at=datetime.utcnow(),
#                 note="Initial attendance marking"
#             )
#             db.session.add(log)
        
#         # Commit all changes
#         db.session.commit()
        
#         print("✓ Sample data created successfully")
#         print(f"✓ Created {len(users)} users")
#         print(f"✓ Created {len(faculty)} faculty members")
#         print(f"✓ Created {len(students)} students")
#         print(f"✓ Created {len(subjects)} subjects")
#         print(f"✓ Created {len(sessions)} class sessions")
#         print(f"✓ Created attendance records for {len(cs_students)} students")
        
#         print("\n🎉 Database initialization completed successfully!")
#         print("\nSample login credentials:")
#         print("Admin: admin@college.edu")
#         print("Faculty: john.doe@college.edu")
#         print("Faculty: jane.smith@college.edu")
#         print("Faculty: mike.wilson@college.edu")

# if __name__ == "__main__":
#     init_database()
=======
#!/usr/bin/env python3
"""
Database initialization script for the Attendance System
Run this script to create tables and populate with sample data
"""

from app import app, db, socketio
from models import User, Student, Faculty, Subject, ClassSession, Attendance, AttendanceLog, AttendanceStatus, UserRole
from datetime import datetime, date, time
import os

def init_database():
    """Initialize database with tables and sample data"""
    
    with app.app_context():
        # Create all tables
        print("Creating database tables...")
        db.create_all()
        print("✓ Tables created successfully")
        
        # Check if data already exists
        if User.query.first():
            print("Database already contains data. Skipping sample data creation.")
            return
        
        print("Adding sample data...")
        
        # Create sample users
        users_data = [
            {"email": "admin@college.edu", "name": "Admin User", "role": UserRole.ADMIN},
            {"email": "john.doe@college.edu", "name": "Dr. John Doe", "role": UserRole.FACULTY},
            {"email": "jane.smith@college.edu", "name": "Prof. Jane Smith", "role": UserRole.FACULTY},
            {"email": "mike.wilson@college.edu", "name": "Dr. Mike Wilson", "role": UserRole.FACULTY},
        ]
        
        users = []
        for user_data in users_data:
            user = User(**user_data)
            db.session.add(user)
            users.append(user)
        
        db.session.flush()  # Get IDs
        
        # Create sample faculty
        faculty_data = [
            {"user_id": users[1].id, "department": "Computer Science"},
            {"user_id": users[2].id, "department": "Mathematics"},
            {"user_id": users[3].id, "department": "Physics"},
        ]
        
        faculty = []
        for faculty_data_item in faculty_data:
            faculty_member = Faculty(**faculty_data_item)
            db.session.add(faculty_member)
            faculty.append(faculty_member)
        
        db.session.flush()
        
        # Create sample students
        students_data = [
            {"roll_no": "CS101", "name": "Aarav Kumar", "department": "Computer Science", "year": 2024},
            {"roll_no": "CS102", "name": "Priya Sharma", "department": "Computer Science", "year": 2024},
            {"roll_no": "CS103", "name": "Arjun Patel", "department": "Computer Science", "year": 2024},
            {"roll_no": "CS104", "name": "Ananya Singh", "department": "Computer Science", "year": 2024},
            {"roll_no": "CS105", "name": "Rohan Gupta", "department": "Computer Science", "year": 2024},
            {"roll_no": "CS106", "name": "Diya Reddy", "department": "Computer Science", "year": 2024},
            {"roll_no": "CS107", "name": "Vikram Menon", "department": "Computer Science", "year": 2024},
            {"roll_no": "CS108", "name": "Ishita Rao", "department": "Computer Science", "year": 2024},
            {"roll_no": "CS109", "name": "Aditya Nair", "department": "Computer Science", "year": 2024},
            {"roll_no": "CS110", "name": "Kavya Iyer", "department": "Computer Science", "year": 2024},
            {"roll_no": "MATH101", "name": "Rajesh Kumar", "department": "Mathematics", "year": 2024},
            {"roll_no": "MATH102", "name": "Sneha Patel", "department": "Mathematics", "year": 2024},
            {"roll_no": "PHY101", "name": "Amit Singh", "department": "Physics", "year": 2024},
            {"roll_no": "PHY102", "name": "Pooja Sharma", "department": "Physics", "year": 2024},
        ]
        
        students = []
        for student_data in students_data:
            student = Student(**student_data)
            db.session.add(student)
            students.append(student)
        
        db.session.flush()
        
        # Create sample subjects
        subjects_data = [
            {"code": "CS101", "name": "Data Structures and Algorithms", "semester": 3},
            {"code": "CS102", "name": "Database Management Systems", "semester": 4},
            {"code": "CS103", "name": "Computer Networks", "semester": 5},
            {"code": "MATH101", "name": "Calculus", "semester": 1},
            {"code": "MATH102", "name": "Linear Algebra", "semester": 2},
            {"code": "PHY101", "name": "Mechanics", "semester": 1},
            {"code": "PHY102", "name": "Electromagnetism", "semester": 2},
        ]
        
        subjects = []
        for subject_data in subjects_data:
            subject = Subject(**subject_data)
            db.session.add(subject)
            subjects.append(subject)
        
        db.session.flush()
        
        # Create sample class sessions
        today = date.today()
        sessions_data = [
            {
                "subject_id": subjects[0].id,  # Data Structures
                "faculty_id": faculty[0].id,   # Dr. John Doe
                "date": today,
                "start_time": time(9, 0),
                "end_time": time(10, 30),
                "topic": "Introduction to Trees"
            },
            {
                "subject_id": subjects[1].id,  # Database Management
                "faculty_id": faculty[0].id,   # Dr. John Doe
                "date": today,
                "start_time": time(11, 0),
                "end_time": time(12, 30),
                "topic": "SQL Queries and Joins"
            },
            {
                "subject_id": subjects[3].id,  # Calculus
                "faculty_id": faculty[1].id,   # Prof. Jane Smith
                "date": today,
                "start_time": time(14, 0),
                "end_time": time(15, 30),
                "topic": "Integration Techniques"
            },
        ]
        
        sessions = []
        for session_data in sessions_data:
            session = ClassSession(**session_data)
            db.session.add(session)
            sessions.append(session)
        
        db.session.flush()
        
        # Create sample attendance records
        # For the first session (Data Structures), mark some students present
        cs_students = [s for s in students if s.department == "Computer Science"][:10]
        
        for i, student in enumerate(cs_students):
            status = AttendanceStatus.PRESENT if i < 7 else AttendanceStatus.ABSENT  # 7 present, 3 absent
            attendance = Attendance(
                session_id=sessions[0].id,
                student_id=student.id,
                status=status,
                marked_by=users[1].id,  # Dr. John Doe
                marked_at=datetime.utcnow(),
                reason=None if status == AttendanceStatus.PRESENT else "Not present in class"
            )
            db.session.add(attendance)
            
            # Create attendance log
            log = AttendanceLog(
                attendance_id=attendance.id,
                prev_status=None,
                new_status=status.value,
                changed_by=users[1].id,
                changed_at=datetime.utcnow(),
                note="Initial attendance marking"
            )
            db.session.add(log)
        
        # Commit all changes
        db.session.commit()
        
        print("✓ Sample data created successfully")
        print(f"✓ Created {len(users)} users")
        print(f"✓ Created {len(faculty)} faculty members")
        print(f"✓ Created {len(students)} students")
        print(f"✓ Created {len(subjects)} subjects")
        print(f"✓ Created {len(sessions)} class sessions")
        print(f"✓ Created attendance records for {len(cs_students)} students")
        
        print("\n🎉 Database initialization completed successfully!")
        print("\nSample login credentials:")
        print("Admin: admin@college.edu")
        print("Faculty: john.doe@college.edu")
        print("Faculty: jane.smith@college.edu")
        print("Faculty: mike.wilson@college.edu")

if __name__ == "__main__":
    init_database()
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c


