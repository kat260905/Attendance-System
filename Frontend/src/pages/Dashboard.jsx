import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import Attendance from './Attendance';
import AttendanceReports from '../components/AttendanceReports';
import MyClasses from "./MyClasses";
import AdminAttendanceControls from "./AdminAttendanceControls";
import FacultyDashboard from './FacultyDashboard';
import AdminDashboard from './AdminDashboard';
import StudentDashboard from './StudentDashboard';
import ODApprovalPage from "./ODApprovalPage";
import ODPendingPage from "./ODPendingPage";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => {
    return 'dashboard';
  });

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        if (user?.role === 'ADMIN') return <AdminDashboard />;
        if (user?.role === 'FACULTY') return <FacultyDashboard />;
        if (user?.role === 'STUDENT') return <StudentDashboard />;
      case 'attendance':
        return <Attendance />;
      case 'reports':
        return <AttendanceReports />;
      case 'myClasses':
        return <MyClasses />;
      case 'adminAttendance':
        return <AdminAttendanceControls />;
      case 'odApproval':
        return <ODApprovalPage />;
      case 'pendingOD':
        return <ODPendingPage />;
      case 'applyOD':
        return <StudentDashboard section="apply-od" />;
      case 'myRequests':
        return <StudentDashboard section="requests" />;
      default:
        return <Attendance />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="lg:ml-60 pt-2">
        {renderCurrentPage()}
      </main>
    </div>
  );
}
