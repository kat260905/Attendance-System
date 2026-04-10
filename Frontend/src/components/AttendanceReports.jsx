import { useState, useEffect } from 'react';
import { BarChart3, Download, Users, TrendingUp, FileText, UserCheck, UserX, UserSearch, Target } from 'lucide-react';
import { attendanceAPI, studentAPI, classSessionAPI, facultyAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function AttendanceReports() {
  const { user, isAdmin } = useAuth();
  const [reports, setReports] = useState({
    summary: {},
    student_reports: []
  });
  const [filters, setFilters] = useState({
    class_id: '',
    student_id: '',
    from_date: '',
    to_date: '',
    department: ''
  });
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // If faculty, load classes they handle; if admin, load all students
      const facultyId = isAdmin() ? null : user?.faculty_id;
      
      if (!isAdmin() && user?.faculty_id) {
        // Load faculty's classes
        const classesRes = await facultyAPI.getFacultyClasses(user.faculty_id);
        setClasses(classesRes.data);
      }
      
      const studentsRes = await studentAPI.getAll(facultyId);
      setStudents(studentsRes.data);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  // Update students when class filter changes
  useEffect(() => {
    if (filters.class_id && !isAdmin()) {
      // Filter students by selected class
      const loadClassStudents = async () => {
        const studentsRes = await studentAPI.getAll(user?.faculty_id);
        const filteredStudents = studentsRes.data.filter(
          s => s.class_id === parseInt(filters.class_id)
        );
        setStudents(filteredStudents);
      };
      loadClassStudents();
    } else if (!isAdmin() && user?.faculty_id) {
      // Reset to all faculty's students
      studentAPI.getAll(user.faculty_id).then(res => setStudents(res.data));
    }
  }, [filters.class_id]);

  const generateReport = async () => {
    try {
      setLoading(true);
      const params = {};
      
      // Faculty can only see their students' reports
      if (!isAdmin() && user?.faculty_id) {
        params.faculty_id = user.faculty_id;
      }
      
      if (filters.class_id) params.class_id = filters.class_id;
      if (filters.student_id) params.student_id = filters.student_id;
      if (filters.from_date) params.from = filters.from_date;
      if (filters.to_date) params.to = filters.to_date;
      if (filters.department) params.department = filters.department;

      const response = await attendanceAPI.getReport(params);
      setReports({
        summary: response.data,
        student_reports: response.data.student_reports || []
      });
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const params = {};
      
      // Faculty can only export their students' data
      if (!isAdmin() && user?.faculty_id) {
        params.faculty_id = user.faculty_id;
      }
      
      if (filters.class_id) params.class_id = filters.class_id;
      if (filters.student_id) params.student_id = filters.student_id;
      if (filters.department) params.department = filters.department;

      const response = await attendanceAPI.exportAttendance(params);
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getAttendancePercentage = () => {
    const { summary } = reports;
    if (!summary.total_records || summary.total_records === 0) return 0;
    const present = summary.summary?.present || 0;
    const od = summary.summary?.od || 0;
    return Math.round(((present + od) / summary.total_records) * 100);
  };

  const getPercentageColor = (percentage) => {
    if (percentage >= 75) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="text-blue-900" />
          Attendance Reports
        </h2>
        <p className="text-gray-600 mt-2">
          {isAdmin() 
            ? "Generate comprehensive attendance reports and analytics for all students and departments"
            : "Generate attendance reports for students in your classes"
          }
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Report Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Class filter - only for Faculty */}
          {!isAdmin() && classes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select
                value={filters.class_id}
                onChange={(e) => handleFilterChange('class_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.department} - Year {cls.year} - Section {cls.section} ({cls.subject_name})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
            <select
              value={filters.student_id}
              onChange={(e) => handleFilterChange('student_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            >
              <option value="">All Students</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.roll_no})
                </option>
              ))}
            </select>
          </div>

          {/* Department filter - only visible to Admin */}
          {isAdmin() && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            >
              <option value="">All Departments</option>
              <option value="IT">IT</option>
              <option value="Computer Science">Computer Science</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Civil">Civil</option>
            </select>
          </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => handleFilterChange('from_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => handleFilterChange('to_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={generateReport}
              disabled={loading}
              className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <BarChart3 size={18} />
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            <button
              onClick={exportReport}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {reports.summary.total_records > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 pb-6 border-b border-gray-200">
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-2.5 border border-gray-300 shadow-sm">
                <FileText className="text-gray-700" size={20} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-gray-500">Total Records</div>
                <div className="text-2xl font-bold text-gray-900">{reports.summary.total_records}</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-2.5 border border-gray-300 shadow-sm text-green-600">
                <UserCheck size={20} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-gray-500">Present</div>
                <div className="text-2xl font-bold text-gray-900">{reports.summary.summary?.present || 0}</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-2.5 border border-gray-300 shadow-sm text-red-600">
                <UserX size={20} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-gray-500">Absent</div>
                <div className="text-2xl font-bold text-gray-900">{reports.summary.summary?.absent || 0}</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-2.5 border border-gray-300 shadow-sm text-blue-600">
                <UserSearch size={20} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-gray-500">On Duty</div>
                <div className="text-2xl font-bold text-gray-900">{reports.summary.summary?.od || 0}</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:shadow-sm transition-shadow md:col-span-1 col-span-2">
            <div className="flex items-center justify-between h-full">
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 flex items-center gap-1"><Target size={14} /> Overall</div>
                <div className={`text-3xl font-extrabold ${getPercentageColor(getAttendancePercentage())}`}>
                  {getAttendancePercentage()}%
                </div>
              </div>
              <div className={`rounded-full p-3 bg-white border ${
                getAttendancePercentage() >= 75 ? 'border-green-200 text-green-600' :
                getAttendancePercentage() >= 65 ? 'border-yellow-200 text-yellow-600' : 'border-red-200 text-red-600'
              } shadow-sm`}>
                <TrendingUp size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student-wise Attendance Report */}
      {reports.student_reports.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Student-wise Attendance Report</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">S.No</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Roll No</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Student Name</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">Total Classes</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">Present</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">Absent</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">OD</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.student_reports.map((student, index) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.roll_no}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{student.student_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-center">{student.total}</td>
                    <td className="px-6 py-4 text-sm text-green-600 text-center font-medium">{student.present}</td>
                    <td className="px-6 py-4 text-sm text-red-600 text-center font-medium">{student.absent}</td>
                    <td className="px-6 py-4 text-sm text-blue-600 text-center font-medium">{student.od}</td>
                    <td className={`px-6 py-4 text-sm text-center font-bold ${getPercentageColor(student.present_percentage)}`}>
                      {student.present_percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!reports.summary.total_records && (
        <div className="p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Data Available</h3>
          <p className="text-gray-500">Click "Generate Report" to view attendance analytics.</p>
        </div>
      )}
      </div>
    </div>
  );
}
