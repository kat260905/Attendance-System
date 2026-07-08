# Attendance Management System

A comprehensive attendance management system built with Flask (Python) backend and React frontend, featuring real-time updates, digital record keeping, advanced reporting, and OD (On Duty) management.

## 🌟 Key Features

### Core Functionality

- **📋 Faculty Attendance Marking**: Intuitive interface for marking student attendance in real-time
- **🔢 Quick Mark by Register Number**: Fast attendance marking using last 3 digits of register numbers
- **📊 Real-time Synchronization**: Live updates across multiple devices using Socket.IO
- **🔍 Digital Record Keeping**: Complete attendance history with comprehensive audit logs
- **📱 Mobile App**: Companion Flutter application for students to view their dashboard, attendance, and OD requests on the go

### Reporting & Analytics

- **📈 Comprehensive Reports**: Generate detailed attendance reports with filters by student, class, department, and date range
- **📉 Analytics Dashboard**: Visual representation of attendance statistics and trends
- **📄 CSV Export**: Export attendance data for external analysis and record-keeping
- **👥 Student-wise Reports**: Individual student attendance breakdown with percentage calculations
- **⏳ OD Management**: Track On Duty (OD) requests and approvals with separate calculation from absences

### User Management

- **🔐 Role-based Access Control**: Three-tier user system (Admin, Faculty, Student)
- **👨‍🏫 Faculty Management**: Department-wise faculty allocation and class assignments
- **👨‍🎓 Student Management**: Centralized student information with department and batch organization
- **🛡️ Audit Trail**: Complete logging of all attendance changes with timestamps and user information

### Advanced Features

- **📅 Automatic Session Generation**: Weekly class session generation based on timetable
- **🔗 Subject-Class-Faculty Mapping**: Unified management of faculty, subjects, and classes
- **⚙️ Flexible Filtering**: Filter reports by multiple criteria (date range, department, class, subject)
- **🎯 OD Approval Workflow**: Manage student OD requests with approval status tracking

## 💻 Technology Stack

### Backend

- **Flask**: Python web framework for REST API
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Relational database (Supabase)
- **Flask-SocketIO**: Real-time bidirectional communication
- **Flask-CORS**: Cross-Origin Resource Sharing support
- **Flask-Migrate**: Database migration management
- **Redis**: In-memory data store for API response caching
- **APScheduler**: Background task scheduling for session generation
- **python-dotenv**: Environment variable management

### Frontend

- **React 18**: JavaScript library for UI
- **Vite**: Modern build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Axios**: HTTP client for API requests
- **Socket.IO Client**: Real-time communication client
- **Recharts**: Composable charting library for dashboards
- **React Router v6**: Client-side routing
- **Lucide Icons**: Beautiful, consistent icon library
- **ESLint**: Code quality and style checking

### Mobile App (Companion)

- **Flutter**: UI toolkit for building natively compiled applications for mobile
- **Provider**: State management
- **FL Chart**: Highly customizable charting library for Flutter
- **Flutter Secure Storage**: Encrypted local storage for authentication tokens

## 📋 Prerequisites

- **Python**: 3.8 or higher
- **Node.js**: 16 or higher
- **npm**: 8 or higher (comes with Node.js)
- **PostgreSQL**: 12 or higher (or Supabase account for managed PostgreSQL)
- **Git**: For version control
- **Text Editor/IDE**: VS Code recommended

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd attendance-zip
```

### 2. Backend Setup

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Environment Configuration

Create a `.env` file in the project root:

```env
# Database Configuration
DATABASE_URI=postgresql://username:password@host:port/database_name

# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
```

#### Initialize Database

```bash
python init_db.py
```

This will:

- Create all database tables
- Populate sample data (admin, faculty, students, subjects, classes)
- Generate initial class sessions

#### Run Backend Server

```bash
python app.py
```

Backend API will be available at: **http://localhost:5000**

### 3. Frontend Setup

#### Navigate to Frontend Directory

```bash
cd Frontend
```

#### Install Dependencies

```bash
npm install
```

#### Start Development Server

```bash
npm run dev
```

Frontend application will be available at: **http://localhost:5173**

### 4. Mobile App Setup (Optional)

#### Navigate to Flutter Directory

```bash
cd FlutterApp
```

#### Install Dependencies

```bash
flutter pub get
```

#### Run the App

Ensure you have a connected device or emulator running.

```bash
flutter run
```

*Note: Ensure your `api_service.dart` or `.env` configuration points to the correct backend IP address (use your machine's local IP, not `localhost`, if running on a physical device).*

## 📖 Usage Guide

### 1. Login

Access the application at `http://localhost:5173` and use these demo credentials:

| Role    | Email                   | Password               |
| ------- | ----------------------- | ---------------------- |
| Admin   | admin@college.edu       | (any password in demo) |
| Faculty | john.doe@college.edu    | (any password in demo) |
| Faculty | jane.smith@college.edu  | (any password in demo) |
| Faculty | mike.wilson@college.edu | (any password in demo) |

### 2. Mark Attendance

#### Traditional Method

1. Navigate to "Attendance" section
2. Select a class session from the dropdown
3. View list of students enrolled in that class
4. Check/uncheck boxes to mark students as Present or Absent
5. Use quick action buttons:
   - **Mark All Present**: Check all students in one click
   - **Mark All Absent**: Uncheck all students in one click
6. Click **Submit Attendance** to save

#### Quick Mark by Register Number

1. Click "Quick Mark by Register" tab
2. Enter last 3 digits of student register numbers (e.g., `135`, `042`, `007`)
3. Separate multiple entries with commas or spaces
4. Select status (Present/Absent/OD)
5. Click **Mark** to apply to all entered students

### 3. View & Generate Reports

1. Navigate to **Reports & Analytics** section
2. Apply filters:
   - **Class**: Select specific class (faculty-only)
   - **Student**: Filter by individual student
   - **Department**: Filter by department (admin-only)
   - **Date Range**: Set from and to dates
3. Click **Generate Report** to view statistics
4. View summary cards showing:
   - Total attendance records
   - Count of present students
   - Count of absent students
   - Overall attendance percentage
5. Detailed student-wise table showing:
   - Total classes attended
   - Present/Absent/OD counts
   - Attendance percentage

#### Export Data

1. After generating report, click **Export CSV**
2. File will be downloaded as `attendance_report_YYYY-MM-DD.csv`
3. Open in Excel/Google Sheets for further analysis

### 4. OD (On Duty) Management

#### Request OD

1. Navigate to **OD Requests** section
2. Fill in OD details (date, reason)
3. Submit for approval

#### Approve OD Requests

1. Admin/Faculty navigate to **OD Approval** section
2. Review pending requests
3. Approve or reject with comments
4. Approved requests automatically adjust attendance records

### 5. Dashboard Overview

- **Quick Stats**: View overall attendance statistics
- **Recent Sessions**: See recently conducted classes
- **Pending OD Requests**: Track pending approvals
- **System Notifications**: Real-time updates on attendance changes

## 🔌 API Endpoints

_Note: Base URL is `http://localhost:5000`_

### Authentication Endpoints

| Method | Endpoint             | Purpose                  |
| ------ | -------------------- | ------------------------ |
| POST   | `/api/auth/login`    | User login with email    |
| POST   | `/api/auth/register` | Register new user        |
| GET    | `/api/auth/me`       | Get current user details |

### Student Management

| Method | Endpoint                              | Purpose                 |
| ------ | ------------------------------------- | ----------------------- |
| GET    | `/api/students`                       | Get all students        |
| GET    | `/api/students?faculty_id=ID`         | Get students by faculty |
| POST   | `/api/students`                       | Create new student      |
| GET    | `/api/students/{id}`                  | Get student by ID       |
| GET    | `/api/sessions/{session_id}/students` | Get students in a class |

### Faculty Management

| Method | Endpoint                    | Purpose                        |
| ------ | --------------------------- | ------------------------------ |
| GET    | `/api/faculty`              | Get all faculty members        |
| POST   | `/api/faculty`              | Create faculty member          |
| GET    | `/api/faculty/{id}/classes` | Get faculty's assigned classes |

### Subject Management

| Method | Endpoint        | Purpose            |
| ------ | --------------- | ------------------ |
| GET    | `/api/subjects` | Get all subjects   |
| POST   | `/api/subjects` | Create new subject |

### Class Sessions

| Method | Endpoint                                    | Purpose                      |
| ------ | ------------------------------------------- | ---------------------------- |
| GET    | `/api/class-sessions`                       | Get all sessions             |
| POST   | `/api/class-sessions`                       | Create new session           |
| GET    | `/api/class-sessions/faculty/{id}`          | Get faculty's today sessions |
| GET    | `/api/class-sessions/faculty/{id}?all=true` | Get all faculty sessions     |
| GET    | `/api/class-sessions/class/{id}`            | Get class sessions by class  |

### Attendance

| Method | Endpoint                         | Purpose                               |
| ------ | -------------------------------- | ------------------------------------- |
| POST   | `/api/attendance/mark`           | Mark attendance for multiple students |
| POST   | `/api/attendance/mark-by-suffix` | Mark by register number suffix        |
| GET    | `/api/attendance/session/{id}`   | Get attendance for a session          |
| PUT    | `/api/attendance/{id}`           | Update single attendance record       |
| GET    | `/api/attendance/report`         | Generate attendance reports           |
| GET    | `/api/attendance/export`         | Export attendance as CSV              |

**Report Query Parameters:**

```
?student_id=ID          - Filter by student
?faculty_id=ID          - Filter by faculty
?class_id=ID            - Filter by class
?subject_id=ID          - Filter by subject
?department=DEPT        - Filter by department
?from=YYYY-MM-DD        - Start date
?to=YYYY-MM-DD          - End date
```

### Student OD Workflow

| Method | Endpoint                          | Purpose                                 |
| ------ | --------------------------------- | --------------------------------------- |
| POST   | `/api/student/od/submit`          | Submit a new OD request (with document) |
| GET    | `/api/student/od/my-requests`     | Get all OD requests for a student       |
| GET    | `/api/student/od/document/{id}`   | Download supporting document for an OD  |
| GET    | `/api/student/attendance/summary` | Get personal attendance summary         |

### Admin OD Management

| Method | Endpoint                             | Purpose                             |
| ------ | ------------------------------------ | ----------------------------------- |
| GET    | `/api/admin/od/pending-requests`     | Get all pending student OD requests |
| POST   | `/api/admin/od/approve-request/{id}` | Approve a student's OD request      |
| POST   | `/api/admin/od/reject-request/{id}`  | Reject a student's OD request       |

### Faculty OD Application

| Method | Endpoint             | Purpose                              |
| ------ | -------------------- | ------------------------------------ |
| GET    | `/api/od/pending`    | Get approved ODs ready to be applied |
| PUT    | `/api/od/apply/{id}` | Apply an approved OD to attendance   |

### Dashboard & Analytics

| Method                    | Endpoint                                     | Purpose                                                                  |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| GET                       | `/api/admin/dashboard/summary`               | Get admin dashboard summary stats                                        |
| GET                       | `/api/admin/dashboard/department-attendance` | Get attendance breakdown by department                                   |
| GET                       | `/api/admin/dashboard/faculty-performance`   | Get metrics on faculty activity                                          |
| GET                       | `/api/faculty/{id}/dashboard/summary`        | Get faculuser_id, roll_no, name, department, year, class_id              |
| **faculties**             | Faculty profiles                             | id, user_id, department                                                  |
| **subjects**              | Course subjects                              | id, code, name, semester                                                 |
| **classes**               | Class information                            | id, department, year, section                                            |
| **class_sessions**        | Individual class sessions                    | id, subject_id, faculty_id, class_id, date, start_time, end_time, topic  |
| **attendance**            | Attendance records                           | id, session_id, student_id, status, marked_by, marked_at, reason         |
| **attendance_logs**       | Audit trail for changes                      | id, attendance_id, prev_status, new_status, changed_by, changed_at, note |
| **timetables**            | Weekly timetable entries                     | id, faculty_id, subject_id, day_of_week, start_time, end_time            |
| **faculty_subject_class** | Faculty-Subject-Class mapping                | id, faculty_id, subject_id, class_id                                     |
| **student_od_requests**   | Student-initiated OD requests                | id, student_id, from_date, to_date, reason, status, reviewed_by          |
| **approved_od_requests**  | Admin-approved ODs for faculty               | id, student_id, date, reason, approved_by, applied, applied_by           |

### Utilities

| Method | Endpoint                      | Purpose                  |
| ------ | ----------------------------- | ------------------------ |
| POST   | `/api/generate-week-sessions` | Generate weekly sessions |
| GET    | `/test-db`                    | Test database connection |
| GET    | `/api/debug/users`            | Debug: List all users    |

## 📊 Database Schema

### Core Tables

| Table                     | Purpose                          | Key Fields                                                               |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| **users**                 | User accounts and authentication | id, email, name, role                                                    |
| **students**              | Student information              | id, roll_no, name, department, year, class_id                            |
| **faculties**             | Faculty profiles                 | id, user_id, department                                                  |
| **subjects**              | Course subjects                  | id, code, name, semester                                                 |
| **classes**               | Class information                | id, department, year, section                                            |
| **class_sessions**        | Individual class sessions        | id, subject_id, faculty_id, class_id, date, start_time, end_time, topic  |
| **attendance**            | Attendance records               | id, session_id, student_id, status, marked_by, marked_at, reason         |
| **attendance_logs**       | Audit trail for changes          | id, attendance_id, prev_status, new_status, changed_by, changed_at, note |
| **timetables**            | Weekly timetable entries         | id, faculty_id, subject_id, day_of_week, start_time, end_time            |
| **faculty_subject_class** | Faculty-Subject-Class mapping    | id, faculty_id, subject_id, class_id                                     |
| **approved_od_requests**  | OD request management            | id, student_id, class_id, session_id, date, reason, approved_by, applied |

### Attendance Status Values

- `present` - Student was present
- `absent` - Student was absent
- `od` - On Duty (excused absence)

### User Roles

- `ADMIN` - System administrator with full access
- `FACULTY` - Faculty member who marks attendance
- `STUDENT` - Student whose attendance is tracked

## 📁 Project Structure

```
attendance-zip/
├── Backend Files
│   ├── app.py                 # Main Flask application and API routes
│   ├── models.py              # SQLAlchemy ORM models
│   ├── init_db.py             # Database initialization and sample data
│   ├── start_system.py        # System startup script
│   ├── migration_student_od.py # Migration script for OD system
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables (not in repo)
│
├── Database Migrations
│   ├── migrations/
│   │   ├── alembic.ini        # Alembic configuration
│   │   ├── env.py             # Migration environment
│   │   └── versions/          # Migration scripts
│   └── __pycache__/
│
├── Frontend React App
│   ├── Frontend/
│   │   ├── package.json       # Node.js dependencies
│   │   ├── vite.config.js     # Vite build configuration
│   │   ├── tailwind.config.js # Tailwind CSS configuration
│   │   ├── eslint.config.js   # ESLint configuration
│   │   ├── index.html         # HTML entry point
│   │   │
│   │   ├── src/
│   │   │   ├── main.jsx           # React app entry point
│   │   │   ├── App.jsx            # Main app component
│   │   │   ├── index.css          # Global styles
│   │   │   ├── App.css            # App component styles
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── AdminODreview.jsx      # Admin OD review UI
│   │   │   │   ├── AttendanceReports.jsx  # Reports generation component
│   │   │   │   ├── LoadingSpinner.jsx     # Loading component
│   │   │   │   ├── Login.jsx              # Login page
│   │   │   │   ├── Navigation.jsx         # Navigation bar
│   │   │   │   ├── StudentDashboard.jsx   # Student Dashboard view
│   │   │   │   └── Toast.jsx              # Toast notifications
│   │   │   │
│   │   │   ├── contexts/
│   │   │   │   └── AuthContext.jsx       # Authentication context
│   │   │   │
│   │   │   ├── pages/
│   │   │   │   ├── AdminAttendanceControls.jsx # Advanced attendance controls
│   │   │   │   ├── AdminDashboard.jsx     # Admin Dashboard page
│   │   │   │   ├── Attendance.jsx         # Attendance page
│   │   │   │   ├── Dashboard.jsx          # Generic Dashboard page
│   │   │   │   ├── FacultyDashboard.jsx   # Faculty Dashboard page
│   │   │   │   ├── MyClasses.jsx          # Classes management
│   │   │   │   ├── ODApprovalPage.jsx     # OD approval page
│   │   │   │   ├── ODPendingPage.jsx      # OD pending requests
│   │   │   │   └── StudentDashboard.jsx   # Student portal
│   │   │   │
│   │   │   ├── services/
│   │   │   │   ├── api.js                # API client (Axios)
│   │   │   │   └── socket.js             # Socket.IO client
│   │   │   │
│   │   │   └── assets/                   # Images and static assets
│   │   │
│   │   ├── public/                       # Public static files
│   │   └── dist/                         # Production build output
│   │
│   └── uploads/                          # File uploads directory
│
├── FlutterApp/                # Flutter Mobile Application
│   ├── lib/
│   │   ├── models/            # Data models
│   │   ├── providers/         # State management providers
│   │   ├── screens/           # UI screens (e.g., student dashboard)
│   │   ├── services/          # API and storage services
│   │   ├── utils/             # Helper functions and constants
│   │   └── main.dart          # App entry point
│   └── pubspec.yaml           # Flutter dependencies
│
├── README.md                  # This file
└── .gitignore                 # Git ignore rules
```

## ⚡ Real-time Features

The system uses **Socket.IO** for seamless real-time communication:

- **Live Attendance Updates**: Changes made by faculty instantly reflect on all connected devices
- **Session-based Rooms**: Faculty members join class-specific rooms to receive only relevant updates
- **Automatic Synchronization**: Multiple admins/staff can monitor attendance simultaneously
- **Event Broadcasting**: Attendance changes trigger instant notifications to connected clients

## 🛠️ Development

### Backend Development

```bash
# Run with auto-reload (Flask development mode)
python app.py

# Database migrations
flask db migrate -m "Description of changes"
flask db upgrade

# Rollback migration
flask db downgrade

# Create new migration from model changes
flask db migrate --autogenerate -m "Description"
```

### Frontend Development

```bash
cd Frontend

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

### Environment Variables

Create a `.env` file at the project root:

```env
# Database
DATABASE_URI=postgresql://username:password@localhost:5432/attendance_db

# Flask
FLASK_ENV=development
FLASK_APP=app.py
SECRET_KEY=your-secret-key-here

# CORS (adjust for production)
FRONTEND_URL=http://localhost:5173

# Optional: File upload settings
MAX_FILE_SIZE=52428800  # 50MB in bytes
UPLOAD_FOLDER=uploads
```

## 🐛 Troubleshooting

### Database Connection Issues

**Problem**: `Connection refused` or `FATAL: role "username" does not exist`

**Solutions:**

1. Verify PostgreSQL is running
2. Check DATABASE_URI format: `postgresql://user:password@host:port/dbname`
3. Ensure database credentials are correct
4. For Supabase: Get connection string from dashboard

```bash
# Test connection
python -c "from app import db; print('Connected' if db.engine.connect() else 'Failed')"
```

### Port Already in Use

**Problem**: `Address already in use` error

**Solutions:**

```bash
# Find and kill process on port 5000 (Backend)
lsof -ti:5000 | xargs kill -9

# Find and kill process on port 5173 (Frontend)
lsof -ti:5173 | xargs kill -9
```

### Frontend Cannot Connect to Backend

**Problem**: CORS errors or connection refused

**Solutions:**

1. Ensure backend is running on `http://localhost:5000`
2. Check CORS configuration in `app.py`
3. Verify API endpoints in `Frontend/src/services/api.js`
4. Check browser console for detailed errors

### No Data Showing in Reports

**Problem**: Empty attendance reports despite marking attendance

**Solutions:**

1. Verify attendance was submitted (check success message)
2. Ensure date filters are not excluding the data
3. Check if faculty has students assigned in their classes
4. Verify data in database: `python init_db.py` to reset with sample data

## 📚 Sample Data

The system includes pre-populated sample data after running `python init_db.py`:

- **Users**: 1 Admin + 3 Faculty members
- **Students**: 14 students across CS, Math, and Physics departments
- **Subjects**: 7 subjects with varying semesters
- **Classes**: Pre-defined class structures
- **Sessions**: 3 sample class sessions for testing
- **Attendance**: Sample attendance records with mixed statuses

## 🚀 Production Deployment

### Backend Deployment (Using Gunicorn)

1. **Install Gunicorn**

```bash
pip install gunicorn
```

2. **Create Production `.env`**

```env
DATABASE_URI=postgresql://prod_user:prod_password@prod_host:5432/attendance_prod
FLASK_ENV=production
SECRET_KEY=generate-a-strong-secret-key
```

3. **Run with Gunicorn**

```bash
gunicorn --workers 4 --bind 0.0.0.0:5000 app:app
```

4. **Using Systemd (Linux)**
   Create `/etc/systemd/system/attendance-api.service`:

```ini
[Unit]
Description=Attendance Management API
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/attendance-zip
ExecStart=/usr/bin/gunicorn --workers 4 --bind 0.0.0.0:5000 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

### Frontend Deployment (Using Nginx)

1. **Build Production Bundle**

```bash
cd Frontend
npm run build
```

2. **Configure Nginx**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/attendance/dist;
    index index.html;

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # WebSocket support for Socket.IO
    location /socket.io {
        proxy_pass http://localhost:5000/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

3. **Enable SSL/HTTPS** (using Let's Encrypt):

```bash
sudo certbot --nginx -d your-domain.com
```

### Database Backup

```bash
# PostgreSQL backup
pg_dump attendance_db > backup_$(date +%Y%m%d).sql

# Restore from backup
psql attendance_db < backup_20260212.sql
```

## 🤝 Contributing

1. **Fork** the repository on GitHub
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** your changes: `git commit -m "Add your feature description"`
4. **Push** to the branch: `git push origin feature/your-feature-name`
5. **Open** a Pull Request with detailed description

### Development Guidelines

- Follow PEP 8 for Python code
- Use meaningful variable and function names
- Add comments for complex logic
- Write docstrings for functions
- Test changes locally before submitting PR
- Keep commits atomic and descriptive

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

## 🤝 Support & Contact

For issues, questions, or suggestions:

- **Report Issues**: Create an issue in the GitHub repository
- **Email**: [support email if applicable]
- **Documentation**: Check README and inline code comments
- **FAQ**: Common issues are listed in Troubleshooting section above

## 🔄 Version History

| Version | Release Date | Key Features                                  |
| ------- | ------------ | --------------------------------------------- |
| 1.0.0   | 2026-02-12   | Initial release with core attendance features |
| 1.1.0   | 2026-03-15   | OD management system & Student Dashboards     |
| 1.2.0   | 2026-05-15   | Mobile app support (Flutter companion app)    |
| 2.0.0   | TBD          | Advanced analytics and reporting              |

## 📝 Credits

- Built with ❤️ for educational institutions
- Special thanks to Flask, React, and the open-source community
- Utilizes Supabase for managed PostgreSQL hosting
