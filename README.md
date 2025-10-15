# Attendance Management System

A comprehensive attendance management system built with Flask (Python) backend and React frontend, featuring real-time updates, digital record keeping, and comprehensive reporting.

## Features

- **Faculty Attendance Marking**: Easy-to-use interface for marking student attendance
- **Real-time Updates**: Live updates using Socket.IO for instant synchronization
- **Digital Record Keeping**: Complete attendance history with audit logs
- **Comprehensive Reports**: Generate attendance reports for students, faculty, and administration
- **CSV Export**: Export attendance data for external analysis
- **User Authentication**: Role-based access control (Admin, Faculty, Student)
- **Session Management**: Track class sessions with subjects, dates, and times

## Technology Stack

### Backend
- **Flask**: Python web framework
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Database (hosted on Supabase)
- **Flask-SocketIO**: Real-time communication
- **Flask-Migrate**: Database migrations

### Frontend
- **React**: JavaScript library for building user interfaces
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client for API requests
- **Socket.IO Client**: Real-time communication
- **React Router**: Client-side routing

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn
- PostgreSQL database (Supabase account)

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ERP-System
```

### 2. Backend Setup

1. **Install Python Dependencies**
```bash
pip install -r requirements.txt
```

2. **Environment Configuration**
   - Copy `.env` file and update with your database credentials:
   ```env
   DATABASE_URI=postgresql://username:password@host:port/database
   ```

3. **Database Initialization**
```bash
python init_db.py
```

4. **Run the Backend Server**
```bash
python app.py
```
The backend will be available at `http://localhost:5000`

### 3. Frontend Setup

1. **Navigate to Frontend Directory**
```bash
cd Frontend
```

2. **Install Dependencies**
```bash
npm install
```

3. **Start Development Server**
```bash
npm run dev
```
The frontend will be available at `http://localhost:5173`

## Usage

### 1. Login
- Use the demo credentials provided on the login page
- Admin: `admin@college.edu`
- Faculty: `john.doe@college.edu`, `jane.smith@college.edu`, `mike.wilson@college.edu`

### 2. Mark Attendance
1. Select a class session from the dropdown
2. Mark students as present/absent using checkboxes
3. Use "Mark All Present/Absent" for quick actions
4. Click "Submit Attendance" to save

### 3. View Reports
1. Navigate to "Reports & Analytics" tab
2. Apply filters (student, department, date range)
3. Generate reports to view attendance statistics
4. Export data as CSV for external analysis

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Create student
- `GET /api/students/{id}` - Get student by ID

### Faculty
- `GET /api/faculty` - Get all faculty
- `POST /api/faculty` - Create faculty member

### Subjects
- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Create subject

### Class Sessions
- `GET /api/class-sessions` - Get all sessions
- `POST /api/class-sessions` - Create session
- `GET /api/class-sessions/faculty/{id}` - Get faculty sessions

### Attendance
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance/session/{id}` - Get session attendance
- `PUT /api/attendance/{id}` - Update attendance
- `GET /api/attendance/report` - Generate reports
- `GET /api/attendance/export` - Export CSV

## Database Schema

### Core Tables
- **users**: User accounts and authentication
- **students**: Student information
- **faculties**: Faculty profiles
- **subjects**: Course subjects
- **class_sessions**: Class session details
- **attendance**: Attendance records
- **attendance_logs**: Audit trail for attendance changes

## Real-time Features

The system uses Socket.IO for real-time updates:
- Live attendance updates across multiple devices
- Session-based room management
- Automatic synchronization of attendance changes

## Sample Data

The system comes with pre-populated sample data:
- 4 users (1 admin, 3 faculty)
- 14 students across different departments
- 7 subjects
- 3 class sessions
- Sample attendance records

## Development

### Backend Development
```bash
# Run with auto-reload
python app.py

# Database migrations
flask db migrate -m "Description"
flask db upgrade
```

### Frontend Development
```bash
cd Frontend
npm run dev
```

## Production Deployment

### Backend
1. Set up a production WSGI server (Gunicorn)
2. Configure environment variables
3. Set up database connection
4. Enable SSL/HTTPS

### Frontend
1. Build the production bundle:
```bash
cd Frontend
npm run build
```
2. Serve static files with a web server (Nginx)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
