import re
import os

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
if 'from flask_jwt_extended' not in content:
    content = content.replace('import redis', 'import redis\nfrom flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity\n', 1)

# 2. Config
jwt_config = '''app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT Configuration
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret-key-change-me")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=2)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)
jwt = JWTManager(app)'''
content = content.replace("app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False", jwt_config, 1)

# 3. require_faculty
require_faculty_old = '''def require_faculty(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        # In production, check session/jwt and ensure user.role == faculty
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper'''
require_faculty_new = '''def require_faculty(f):
    @wraps(f)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user or user.role.value != "FACULTY":
            return jsonify({"error": "Faculty access required"}), 403
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper'''
content = content.replace(require_faculty_old, require_faculty_new)

# 4. login
login_old = '''        if user.role == UserRole.STUDENT:
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
        })'''
login_new = '''        if user.role == UserRole.STUDENT:
            student = Student.query.filter_by(user_id=user.id).first()
            if student:
                student_id = student.id

        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        # In production, verify password hash
        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value,
                "faculty_id": faculty_id, 
                "student_id": student_id,
            },
            "message": "Login successful"
        })'''
content = content.replace(login_old, login_new)

# 5. auth/me and refresh
auth_me_old = '''@app.route("/api/auth/me", methods=["GET"])
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
    })'''
auth_me_new = '''@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    faculty_id = None
    student_id = None
    if user.role.value == "FACULTY":
        faculty = Faculty.query.filter_by(user_id=user.id).first()
        if faculty: faculty_id = faculty.id
    elif user.role.value == "STUDENT":
        student = Student.query.filter_by(user_id=user.id).first()
        if student: student_id = student.id
    
    return jsonify({
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "faculty_id": faculty_id,
        "student_id": student_id,
    })

@app.route("/api/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    current_user_id = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user_id)
    return jsonify(access_token=new_access_token)'''
content = content.replace(auth_me_old, auth_me_new)

# 6. Add @jwt_required() to all routes EXCEPT auth endpoints and test routes
def add_jwt(match):
    route_str = match.group(0)
    skipped = ['/api/auth/login', '/api/auth/register', '/test-db', '/api/auth/me', '/api/auth/refresh']
    if any(s in route_str for s in skipped):
        return route_str
    
    # If the route already has jwt_required, we shouldn't add it again but this is a clean file.
    # Check if the next line is @jwt_required
    return route_str + '\n@jwt_required()'

# Match @app.route(...) capturing the whole line
content = re.sub(r'^@app\.route\(.*?\)$', add_jwt, content, flags=re.MULTILINE)

# Some routes might also have @require_faculty which already requires JWT, so we'll have @jwt_required() \n @require_faculty.
# That is redundant but works, or we can just remove double decorators:
content = content.replace('@jwt_required()\\n@require_faculty', '@require_faculty')

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)
