import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { facultyAPI } from '../services/api';
import { Calendar, TrendingUp, AlertTriangle, Clock, ChevronRight, X } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [courseAlerts, setCourseAlerts] = useState([]);
  const [weeklyTrend, setWeeklyTrend] = useState([]);
  const [courseComparison, setCourseComparison] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [defaulterStudents, setDefaulterStudents] = useState([]);
  const [showStudentList, setShowStudentList] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [user?.faculty_id]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (!user?.faculty_id) return;

      // Load all dashboard data in parallel
      const [summaryRes, alertsRes, trendRes, comparisonRes] = await Promise.all([
        facultyAPI.getDashboardSummary(user.faculty_id),
        facultyAPI.getCourseAlerts(user.faculty_id),
        facultyAPI.getWeeklyTrend(user.faculty_id),
        facultyAPI.getCourseComparison(user.faculty_id)
      ]);

      setSummary(summaryRes.data);
      setCourseAlerts(alertsRes.data);
      setWeeklyTrend(trendRes.data);
      setCourseComparison(comparisonRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseRowClick = async (course) => {
    try {
      setSelectedCourse(course);
      const res = await facultyAPI.getCourseDefaulters(user.faculty_id, course.class_id, course.subject_id);
      setDefaulterStudents(res.data);
      setShowStudentList(true);
    } catch (err) {
      console.error('Failed to load defaulter students:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading faculty dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Faculty Dashboard</h1>
              <p className="text-gray-600 mt-2">Course-level monitoring & analytics</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Today's Classes */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Classes</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{summary?.todays_classes || 0}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Calendar className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          {/* Overall Avg Attendance */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Avg Attendance</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{summary?.overall_attendance || 0}%</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <TrendingUp className="text-green-600" size={20} />
              </div>
            </div>
          </div>

          {/* Total Defaulters */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Defaulters</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{summary?.total_defaulters || 0}</p>
              </div>
              <div className="bg-red-100 rounded-full p-3">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
            </div>
          </div>

          {/* Pending Attendance */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Attendance</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{summary?.pending_attendance || 0}</p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <Clock className="text-yellow-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Course-wise Alerts */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Low Attendance Students (Course-wise)</h2>
            <p className="text-sm text-gray-600 mt-1">Students below 75% attendance threshold</p>
          </div>

          {courseAlerts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Subject</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Section</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Below 75%</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {courseAlerts.map((alert, idx) => (
                    <tr key={idx} className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{alert.subject_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {alert.department} Yr{alert.year} Sec {alert.section}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                          {alert.defaulter_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleCourseRowClick(alert)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        >
                          View List
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p>No low attendance alerts at the moment.</p>
            </div>
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Weekly Attendance Trend - Line Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Weekly Attendance Trend</h3>
            <div className="h-72">
              {weeklyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weeklyTrend.map(d => ({ ...d, day: d.day.slice(0, 3) }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#d1d5db' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#d1d5db' }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Attendance']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }}
                    />
                    <ReferenceLine
                      y={75}
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                      label={{ value: '75% threshold', position: 'right', fontSize: 11, fill: '#ef4444' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">No data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Course-wise Comparison - Bar Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Course-wise Comparison</h3>
            <div className="h-72">
              {courseComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={courseComparison}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="subject_name"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={{ stroke: '#d1d5db' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#d1d5db' }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Avg Attendance']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }}
                    />
                    <ReferenceLine
                      y={75}
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                      label={{ value: '75%', position: 'right', fontSize: 11, fill: '#ef4444' }}
                    />
                    <Bar dataKey="avg_attendance" radius={[6, 6, 0, 0]} barSize={40}>
                      {courseComparison.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.avg_attendance >= 75 ? '#5fe28f' : '#f36e6e'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Defaulter Students Modal */}
      {showStudentList && selectedCourse && (
        <div 
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity"
          onClick={() => setShowStudentList(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-white">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedCourse.subject_name}</h3>
                <p className="text-sm font-medium text-gray-500 mt-1.5 flex items-center gap-2">
                  <span className="bg-gray-100 px-2 py-0.5 rounded-md text-gray-700">
                    {selectedCourse.department} Yr{selectedCourse.year}
                  </span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded-md text-gray-700">
                    Sec {selectedCourse.section}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowStudentList(false)}
                className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-full transition-colors flex-shrink-0"
                aria-label="Close modal"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full">
                <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-md border-b border-gray-100 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Student Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Roll No</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {defaulterStudents.length > 0 ? (
                    defaulterStudents.map((student, idx) => (
                      <tr key={idx} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{student.roll_no}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold ${student.attendance_percentage >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {student.attendance_percentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                        No defaulter students found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
