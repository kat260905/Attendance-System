import { useState } from 'react';
import Navigation from '../components/Navigation';
import Attendance from './Attendance';
import AttendanceReports from '../components/AttendanceReports';

export default function Dashboard() {
  const [currentPage, setCurrentPage] = useState('attendance');

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'attendance':
        return <Attendance />;
      case 'reports':
        return <AttendanceReports />;
      default:
        return <Attendance />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="py-6">
        {renderCurrentPage()}
      </main>
    </div>
  );
}
