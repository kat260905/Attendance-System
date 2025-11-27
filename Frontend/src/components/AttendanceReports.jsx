import { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, Users, TrendingUp, FileText } from 'lucide-react';
import { attendanceAPI, studentAPI, classSessionAPI } from '../services/api';

export default function AttendanceReports() {
  const [reports, setReports] = useState({
    summary: {},
    studentReports: [],
    subjectReports: []
  });
  const [filters, setFilters] = useState({
    student_id: '',
    subject_id: '',
    from_date: '',
    to_date: '',
    department: ''
  });
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [studentsRes, sessionsRes] = await Promise.all([
        studentAPI.getAll(),
        classSessionAPI.getAll()
      ]);
      setStudents(studentsRes.data);
      setSessions(sessionsRes.data);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filters.student_id) params.student_id = filters.student_id;
      if (filters.subject_id) params.subject_id = filters.subject_id;
      if (filters.from_date) params.from = filters.from_date;
      if (filters.to_date) params.to = filters.to_date;
      if (filters.department) params.department = filters.department;

      const response = await attendanceAPI.getReport(params);
      setReports(prev => ({
        ...prev,
        summary: response.data
      }));
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const params = {};
      
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
    return Math.round((present / summary.total_records) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="text-indigo-600" />
          Attendance Reports & Analytics
        </h2>
        <p className="text-gray-600 mt-2">Generate comprehensive attendance reports and analytics</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Report Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
            <select
              value={filters.student_id}
              onChange={(e) => handleFilterChange('student_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Students</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.roll_no})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => handleFilterChange('from_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => handleFilterChange('to_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={generateReport}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 text-black rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <BarChart3 size={18} />
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            <button
              onClick={exportReport}
              className="px-4 py-2 bg-gray-300 text-black rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {reports.summary.total_records > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 rounded-full p-3">
                <FileText className="text-blue-600" size={24} />
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Records</div>
                <div className="text-2xl font-bold text-gray-800">{reports.summary.total_records}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-full p-3">
                <Users className="text-green-600" size={24} />
              </div>
              <div>
                <div className="text-sm text-gray-600">Present</div>
                <div className="text-2xl font-bold text-green-600">{reports.summary.summary?.present || 0}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 rounded-full p-3">
                <Users className="text-red-600" size={24} />
              </div>
              <div>
                <div className="text-sm text-gray-600">Absent</div>
                <div className="text-2xl font-bold text-red-600">{reports.summary.summary?.absent || 0}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 rounded-full p-3">
                <TrendingUp className="text-indigo-600" size={24} />
              </div>
              <div>
                <div className="text-sm text-gray-600">Attendance %</div>
                <div className="text-2xl font-bold text-indigo-600">{getAttendancePercentage()}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Summary */}
      {reports.summary.summary && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Detailed Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Count</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(reports.summary.summary).map(([status, count]) => (
                  <tr key={status}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">
                      {status}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{count}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {Math.round((count / reports.summary.total_records) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {reports.summary.total_records === 0 && (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Data Available</h3>
          <p className="text-gray-500">Generate a report using the filters above to view attendance analytics.</p>
        </div>
      )}
    </div>
  );
}
