import sys
from getpass import getpass
from app import app, db
from models import User, UserRole, Student, Faculty, Class
from werkzeug.security import generate_password_hash

def create_user():
    print("=== Create New System User ===")
    email = input("Email: ").strip()
    name = input("Name: ").strip()
    
    print("\nRoles:")
    print("1. ADMIN")
    print("2. FACULTY")
    print("3. STUDENT")
    role_choice = input("Select Role (1/2/3): ").strip()
    
    role = None
    if role_choice == "1":
        role = UserRole.ADMIN
    elif role_choice == "2":
        role = UserRole.FACULTY
    elif role_choice == "3":
        role = UserRole.STUDENT
    else:
        print("Invalid role selection.")
        return

    password = getpass("Password (input masked): ")
    
    with app.app_context():
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            print("Error: User with this email already exists.")
            return

        # Create base User account with hashed password
        hashed_pw = generate_password_hash(password)
        new_user = User(
            email=email,
            name=name,
            password_hash=hashed_pw,
            role=role
        )
        db.session.add(new_user)
        db.session.flush() # Flush to generate new_user.id before creating related profile
        
        # Create corresponding profile based on role
        if role == UserRole.FACULTY:
            dept = input("Department: ").strip()
            new_faculty = Faculty(user_id=new_user.id, department=dept)
            db.session.add(new_faculty)
            
        elif role == UserRole.STUDENT:
            roll_no = input("Roll No: ").strip()
            dept = input("Department: ").strip()
            year = input("Year (e.g. 1, 2, 3, 4): ").strip()
            
            # Require a class to assign the student to
            classes = Class.query.all()
            if not classes:
                print("\nError: No classes found in the database. You must have at least one class to create a student.")
                db.session.rollback()
                return
                
            print("\nAvailable Classes:")
            for c in classes:
                print(f"ID {c.id}: {c.name} ({c.department} - Year {c.year})")
            
            class_id = input("Select Class ID from the list above: ").strip()
            
            # Map inputs to integer/defaults where necessary
            try:
                new_student = Student(
                    roll_no=roll_no,
                    name=name,
                    department=dept,
                    year=int(year) if year.isdigit() else 1,
                    class_id=int(class_id),
                    user_id=new_user.id
                )
                db.session.add(new_student)
            except Exception as e:
                print(f"Error mapping student details: {e}")
                db.session.rollback()
                return
        
        db.session.commit()
        print(f"\nSuccess! User '{name}' ({role.value}) created successfully.")
        print(f"Login Email: {email}")
        print(f"Password Hash stored in DB: {hashed_pw[:15]}...")

if __name__ == "__main__":
    create_user()