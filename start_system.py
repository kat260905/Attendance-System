#!/usr/bin/env python3
"""
Startup script for the Attendance Management System
This script initializes the database and starts both backend and frontend servers
"""

import subprocess
import sys
import time
from pathlib import Path

def run_command(command, cwd=None, shell=True):
    """Run a command and return the process"""
    print(f"Running: {command}")
    return subprocess.Popen(command, cwd=cwd, shell=shell)

def check_dependencies():
    """Check if required dependencies are installed"""
    print("Checking dependencies...")
    
    try:
        import flask
        import flask_sqlalchemy
        import flask_socketio
        print("✓ Python dependencies are installed")
    except ImportError as e:
        print(f"✗ Missing Python dependency: {e}")
        print("Please run: pip install -r requirements.txt")
        return False
    
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ Node.js is installed: {result.stdout.strip()}")
        else:
            print("✗ Node.js is not installed")
            return False
    except FileNotFoundError:
        print("✗ Node.js is not installed")
        return False
    
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ npm is installed: {result.stdout.strip()}")
        else:
            print("✗ npm is not installed")
            return False
    except FileNotFoundError:
        print("✗ npm is not installed")
        return False
    
    return True

def initialize_database():
    """Initialize the database with sample data"""
    print("\nInitializing database...")
    try:
        result = subprocess.run([sys.executable, 'init_db.py'], capture_output=True, text=True, cwd=Path(__file__).parent)
        if result.returncode == 0:
            print("✓ Database initialized successfully")
            return True
        else:
            print(f"✗ Database initialization failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Database initialization error: {e}")
        return False

def install_frontend_dependencies():
    """Install frontend dependencies"""
    print("\nInstalling frontend dependencies...")
    frontend_dir = Path(__file__).parent / "Frontend"
    
    if not frontend_dir.exists():
        print("✗ Frontend directory not found")
        return False
    
    try:
        result = subprocess.run(['npm', 'install'], cwd=frontend_dir, capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ Frontend dependencies installed successfully")
            return True
        else:
            print(f"✗ Frontend dependency installation failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Frontend dependency installation error: {e}")
        return False

def start_backend():
    """Start the backend server"""
    print("\nStarting backend server...")
    try:
        backend_process = run_command(f"{sys.executable} app.py", cwd=Path(__file__).parent)
        print("✓ Backend server started on http://localhost:5000")
        return backend_process
    except Exception as e:
        print(f"✗ Failed to start backend server: {e}")
        return None

def start_frontend():
    """Start the frontend development server"""
    print("\nStarting frontend server...")
    frontend_dir = Path(__file__).parent / "Frontend"
    
    try:
        frontend_process = run_command("npm run dev", cwd=frontend_dir)
        print("✓ Frontend server started on http://localhost:5173")
        return frontend_process
    except Exception as e:
        print(f"✗ Failed to start frontend server: {e}")
        return None

def main():
    """Main startup function"""
    print("=" * 60)
    print("🎓 ATTENDANCE MANAGEMENT SYSTEM STARTUP")
    print("=" * 60)
    
    if not check_dependencies():
        print("\n❌ Dependency check failed. Please install missing dependencies.")
        sys.exit(1)
    
    if not initialize_database():
        print("\n❌ Database initialization failed.")
        sys.exit(1)
    
    if not install_frontend_dependencies():
        print("\n❌ Frontend dependency installation failed.")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("🚀 STARTING SERVERS")
    print("=" * 60)
    
    backend_process = start_backend()
    if not backend_process:
        print("\n❌ Failed to start backend server.")
        sys.exit(1)
    
    time.sleep(3)
    
    frontend_process = start_frontend()
    if not frontend_process:
        print("\n❌ Failed to start frontend server.")
        backend_process.terminate()
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("✅ SYSTEM STARTED SUCCESSFULLY!")
    print("=" * 60)
    print("🌐 Frontend: http://localhost:5173 (Login page)")
    print("🔧 Backend API: http://localhost:5000")
    print("\n📝 Demo Credentials (select role on login):")
    print("   Admin:   admin@college.edu")
    print("   Faculty: john.doe@college.edu")
    print("   Student: student@college.edu")
    print("   Password: any (demo mode)")
    print("\n💡 Press Ctrl+C to stop all servers")
    print("=" * 60)
    
    try:
        while True:
            time.sleep(1)
            if backend_process.poll() is not None:
                print("\n❌ Backend server stopped unexpectedly")
                break
            if frontend_process.poll() is not None:
                print("\n❌ Frontend server stopped unexpectedly")
                break
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down servers...")
        if backend_process:
            backend_process.terminate()
        if frontend_process:
            frontend_process.terminate()
        print("✅ All servers stopped successfully")
        print("👋 Goodbye!")

if __name__ == "__main__":
    main()
