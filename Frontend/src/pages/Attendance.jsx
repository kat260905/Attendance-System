import { useState, useEffect } from 'react';
import { Check, X, Users, Calendar, BookOpen, User, Save, Download, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { studentAPI, classSessionAPI, attendanceAPI, subjectAPI, facultyAPI } from '../services/api';
import socketService from '../services/socket';

export default function AttendancePage() {
  const { user, isFaculty } = useAuth();
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const currentDate = new Date().toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => {
    loadInitialData();
    setupSocketListeners();
    
    return () => {
      // Cleanup socket listeners
      socketService.offAttendanceMarked();
      socketService.offAttendanceUpdated();
    };
  }, []);

  const loadInitialData = async () => {
    try {
<<<<<<< HEAD
     
      setLoading(true);
      const [subjectsRes, sessionsRes] = await Promise.all([
        //studentAPI.getAll(),
        subjectAPI.getAll(),
        //classSessionAPI.getAll()
        //console.log("FACULTY ID:", user.faculty_id),
        classSessionAPI.getByFaculty(user.faculty_id)
      ]);
      
      //setStudents(studentsRes.data);
=======
      setLoading(true);
      const [studentsRes, subjectsRes, sessionsRes] = await Promise.all([
        studentAPI.getAll(),
        subjectAPI.getAll(),
        classSessionAPI.getAll()
      ]);
      
      setStudents(studentsRes.data);
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
      setSubjects(subjectsRes.data);
      setSessions(sessionsRes.data);
      
      // Set today's session as default if available
      const today = new Date().toISOString().split('T')[0];
      const todaySession = sessionsRes.data.find(s => s.date === today);
      if (todaySession) {
        setSelectedSession(todaySession);
        loadSessionAttendance(todaySession.id);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    socketService.connect();
    
    socketService.onAttendanceMarked((data) => {
      if (data.session_id === selectedSession?.id) {
        setSuccess(`Attendance marked for student ${data.student_id}`);
        setTimeout(() => setSuccess(null), 3000);
      }
    });

    socketService.onAttendanceUpdated((data) => {
      if (data.attendance_id) {
        setSuccess(`Attendance updated for student ${data.student_id}`);
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const loadSessionAttendance = async (sessionId) => {
    try {
      const response = await attendanceAPI.getSessionAttendance(sessionId);
      const attendanceData = {};
      response.data.forEach(record => {
        attendanceData[record.student_id] = record.status === 'present';
      });
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Failed to load session attendance:', error);
      setAttendance({});
    }
  };

<<<<<<< HEAD
  const handleSessionChange = async (sessionId) => {
    const session = sessions.find(s => s.id === parseInt(sessionId));
    setSelectedSession(session);
    setAttendance({}); 

    if (session) {
      const studentsRes = await studentAPI.getBySession(session.id);
      setStudents(studentsRes.data);

=======
  const handleSessionChange = (sessionId) => {
    const session = sessions.find(s => s.id === parseInt(sessionId));
    setSelectedSession(session);
    if (session) {
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
      loadSessionAttendance(session.id);
      socketService.joinSession(session.id);
    }
  };

  const handleAttendanceChange = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const markAllPresent = () => {
    const allPresent = {};
    students.forEach(student => {
      allPresent[student.id] = true;
    });
    setAttendance(allPresent);
  };

  const markAllAbsent = () => {
    const allAbsent = {};
    students.forEach(student => {
      allAbsent[student.id] = false;
    });
    setAttendance(allAbsent);
  };

  const submitAttendance = async () => {
    if (!selectedSession) {
      setError('Please select a class session first.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const records = students.map(student => ({
        student_id: student.id,
        status: attendance[student.id] ? 'present' : 'absent',
        reason: attendance[student.id] ? null : 'Not present in class'
      }));

      const attendanceData = {
        session_id: selectedSession.id,
        records: records,
        marked_by: user.id
      };

      console.log('Submitting attendance data:', attendanceData); // Debug log
      await attendanceAPI.markAttendance(attendanceData);
      setSuccess('Attendance submitted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to submit attendance:', error);
      setError('Failed to submit attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const exportAttendance = async () => {
    if (!selectedSession) {
      setError('Please select a class session first.');
      return;
    }

    try {
      const response = await attendanceAPI.exportAttendance({
        session_id: selectedSession.id
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${selectedSession.subject_name}_${selectedSession.date}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export attendance:', error);
      setError('Failed to export attendance. Please try again.');
    }
  };

<<<<<<< HEAD
  //const presentCount = Object.values(attendance).filter(Boolean).length;
  const presentCount = students.filter(s => attendance[s.id]).length;
=======
  const presentCount = Object.values(attendance).filter(Boolean).length;
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
  const absentCount = students.length - presentCount;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-indigo-600" />
                Attendance Register
              </h1>
              <p className="text-gray-600 mt-1">{currentDate}</p>
              {user && (
                <p className="text-sm text-indigo-600 mt-1">
                  Welcome, {user.name} ({user.role})
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Total Students</div>
              <div className="text-2xl font-bold text-indigo-600">{students.length}</div>
            </div>
          </div>
        </div>

        {/* Session Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="text-indigo-600" />
            Select Class Session
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Session
              </label>
              <select
                value={selectedSession?.id || ''}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select a session...</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.subject_name} - {new Date(session.date).toLocaleDateString()} 
                    {session.start_time && ` (${session.start_time.slice(0,5)} - ${session.end_time?.slice(0,5)})`}
                  </option>
                ))}
              </select>
            </div>
            {selectedSession && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Session Details</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Subject:</strong> {selectedSession.subject_name}</p>
                  <p><strong>Date:</strong> {new Date(selectedSession.date).toLocaleDateString()}</p>
                  {selectedSession.start_time && (
                    <p><strong>Time:</strong> {selectedSession.start_time.slice(0,5)} - {selectedSession.end_time?.slice(0,5)}</p>
                  )}
                  {selectedSession.topic && (
                    <p><strong>Topic:</strong> {selectedSession.topic}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
<<<<<<< HEAD
          <div className="bg-gray-50 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-gray-500 rounded-full p-2">
                <Check className="text-white" size={24} />
              </div>
              <div>
                <div className="text-sm text-black-800">Present</div>
                <div className="text-2xl font-bold text-black-800">{presentCount}</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-gray-500 rounded-full p-2">
                <X className="text-white" size={24} />
              </div>
              <div>
                <div className="text-sm text-black-800">Absent</div>
                <div className="text-2xl font-bold text-black-800">{absentCount}</div>
=======
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 rounded-full p-2">
                <Check className="text-white" size={24} />
              </div>
              <div>
                <div className="text-sm text-green-700">Present</div>
                <div className="text-2xl font-bold text-green-800">{presentCount}</div>
              </div>
            </div>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-500 rounded-full p-2">
                <X className="text-white" size={24} />
              </div>
              <div>
                <div className="text-sm text-red-700">Absent</div>
                <div className="text-2xl font-bold text-red-800">{absentCount}</div>
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex gap-3">
              <button
                onClick={markAllPresent}
<<<<<<< HEAD
                className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2"
=======
                className="px-4 py-2 bg-green-500 text-black rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
              >
                <Check size={18} />
                Mark All Present
              </button>
              <button
                onClick={markAllAbsent}
<<<<<<< HEAD
                className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2"
=======
                className="px-4 py-2 bg-red-500 text-black rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
              >
                <X size={18} />
                Mark All Absent
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportAttendance}
                disabled={!selectedSession}
<<<<<<< HEAD
                className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
=======
                className="px-4 py-2 bg-blue-500 text-black rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
              >
                <Download size={18} />
                Export CSV
              </button>
              <button
                onClick={submitAttendance}
                disabled={!selectedSession || submitting}
<<<<<<< HEAD
                className="px-6 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
=======
                className="px-6 py-2 bg-indigo-600 text-black rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
              >
                <Save size={18} />
                {submitting ? 'Submitting...' : 'Submit Attendance'}
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
<<<<<<< HEAD
            <thead className="bg-blue-900 text-white">
=======
            <thead className="bg-indigo-600 text-white">
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Roll No</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Student Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Department</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Attendance</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr 
                  key={student.id}
                  className={`border-b hover:bg-gray-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">
                    {student.roll_no}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-800">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {student.department}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={attendance[student.id] || false}
                      onChange={() => handleAttendanceChange(student.id)}
<<<<<<< HEAD
                      className="w-5 h-5 text-indigo-600 rounded checked:bg-green-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
=======
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    {attendance[student.id] ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        Present
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        Absent
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Submit Button */}
        {/* <div className="mt-6 flex justify-end">
          <button className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg">
            Submit Attendance
          </button>
        </div>*/}
      </div>
    </div> 
  );
}