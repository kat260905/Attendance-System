import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { classSessionAPI, facultyAPI, attendanceAPI, studentAPI } from "../services/api";
import { Calendar, Users, Check, X, ChevronDown, ChevronRight, Hash } from "lucide-react";

export default function MyClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [expandedDates, setExpandedDates] = useState({});
  const [suffixInput, setSuffixInput] = useState('');
  const [suffixMode, setSuffixMode] = useState('absent');
  const [suffixLoading, setSuffixLoading] = useState(false);
  const [suffixResult, setSuffixResult] = useState(null);

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped = {};
    sessions.forEach(session => {
      const date = session.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(session);
    });
    
    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
    
    return sortedDates.map(date => ({
      date,
      sessions: grouped[date].sort((a, b) => {
        // Sort sessions within each date by start time
        if (a.start_time && b.start_time) {
          return a.start_time.localeCompare(b.start_time);
        }
        return 0;
      })
    }));
  }, [sessions]);

  const toggleDateExpand = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateOnly = (d) => d.toISOString().split('T')[0];
    
    if (dateOnly(date) === dateOnly(today)) {
      return 'Today';
    } else if (dateOnly(date) === dateOnly(yesterday)) {
      return 'Yesterday';
    } else if (dateOnly(date) === dateOnly(tomorrow)) {
      return 'Tomorrow';
    }
    
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  useEffect(() => {
    loadFacultyClasses();
  }, []);

  const loadFacultyClasses = async () => {
    const response = await facultyAPI.getFacultyClasses(user.faculty_id);
    setClasses(response.data);
  };

  const handleClassSelect = async (classId) => {
    setSelectedClass(classId);
    setSelectedSession(null);
    const response = await classSessionAPI.getByClass(classId, user.faculty_id);

    setSessions(response.data);

    
    //setSessions(response.data);
  };

  const handleSessionSelect = async (session) => {
    setSelectedSession(session);
    const resStudents = await studentAPI.getBySession(session.id);
    setStudents(resStudents.data);

    const resAttendance = await attendanceAPI.getSessionAttendance(session.id);
    const attMap = {};
    resAttendance.data.forEach(a => {
      attMap[a.student_id] = a.status === "present";
    });
    setAttendance(attMap);
  };

  const toggleAttendance = (studentId) => {
    setAttendance(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const saveAttendance = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        status: attendance[s.id] ? "present" : "absent"
      }));

      const response = await attendanceAPI.markAttendance({
        session_id: selectedSession.id,
        records,
        marked_by: user.id
      });

      setMessage({ type: "success", text: `Attendance saved successfully! (${records.length} students)` });
      console.log("Attendance saved:", response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Failed to save attendance";
      setMessage({ type: "error", text: errorMsg });
      console.error("Error saving attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuffixMark = async () => {
    if (!selectedSession) {
      setMessage({ type: "error", text: 'Please select a class session first.' });
      return;
    }

    if (!suffixInput.trim()) {
      setMessage({ type: "error", text: 'Please enter at least one register number suffix.' });
      return;
    }

    try {
      setSuffixLoading(true);
      setMessage(null);
      setSuffixResult(null);

      const response = await attendanceAPI.markBySuffix({
        session_id: selectedSession.id,
        suffixes: suffixInput,
        status: suffixMode,
        marked_by: user.id
      });

      const { marked, not_found, message: responseMsg } = response.data;

      // Update local attendance state
      const newAttendance = { ...attendance };
      marked.forEach(record => {
        newAttendance[record.student_id] = suffixMode === 'present';
      });
      setAttendance(newAttendance);

      setSuffixResult({
        marked: marked,
        notFound: not_found,
        message: responseMsg
      });

      if (not_found.length > 0) {
        setMessage({ type: "error", text: `Could not find students with suffixes: ${not_found.join(', ')}` });
      } else {
        setMessage({ type: "success", text: responseMsg });
        setTimeout(() => setMessage(null), 3000);
      }

      setSuffixInput('');
    } catch (error) {
      console.error('Failed to mark attendance by suffix:', error);
      setMessage({ type: "error", text: 'Failed to mark attendance. Please try again.' });
    } finally {
      setSuffixLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Classes</h1>

      {/* Step 1 – Select Class */}
      <div className="mb-6">
        <h2 className="font-semibold text-xl mb-3">Classes You Handle</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {classes.map(c => (
            <button
              key={c.class_id}
              onClick={() => handleClassSelect(c.class_id)}
            className={`${selectedClass === c.class_id ? "bg-blue-100" : "bg-white"} 
              p-4 rounded-lg shadow border hover:bg-blue-50 transition-colors`}
            
            >
            
              <p className="font-medium">Dept: {c.department}</p>
              <p>Year: {c.year}</p>
              <p>Section: {c.section}</p>
              <p className="text-sm mt-2 text-gray-600">{c.subject_name}</p>

             
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 – Select Class Session */}
      {selectedClass && (
        <div className="mb-6">
          <h2 className="font-semibold text-xl mb-3">Sessions</h2>
          {sessionsByDate.length === 0 ? (
            <p className="text-gray-500">No sessions found for this class.</p>
          ) : (
            <div className="space-y-3">
              {sessionsByDate.map(({ date, sessions: dateSessions }) => (
                <div key={date} className="border rounded-lg overflow-hidden shadow-sm">
                  {/* Date Header */}
                  <button
                    onClick={() => toggleDateExpand(date)}
                    className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar size={18} className="text-blue-800" />
                      <span className="font-medium text-gray-800">{formatDate(date)}</span>
                      <span className="text-sm text-gray-500">({dateSessions.length} session{dateSessions.length > 1 ? 's' : ''})</span>
                    </div>
                    {expandedDates[date] ? (
                      <ChevronDown size={20} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-500" />
                    )}
                  </button>
                  
                  {/* Sessions for this date */}
                  {expandedDates[date] && (
                    <div className="bg-white divide-y">
                      {dateSessions.map(s => (
                        <button
                          key={s.id}
                          onClick={() => handleSessionSelect(s)}
                          className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                            selectedSession?.id === s.id ? "bg-blue-50 border-l-4 border-blue-900" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-800">{s.subject_name}</p>
                              <p className="text-sm text-gray-600">
                                {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                              </p>
                              {s.topic && (
                                <p className="text-xs text-gray-500 mt-1">{s.topic}</p>
                              )}
                            </div>
                            {selectedSession?.id === s.id && (
                              <Check size={20} className="text-blue-900" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3 – Attendance Table */}
      {selectedSession && (
        <div>
          <h2 className="font-semibold text-xl mb-4">Attendance</h2>

          {message && (
            <div className={`p-3 mb-4 rounded ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {message.text}
            </div>
          )}

          {/* Quick Mark by Register Number Suffix */}
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Hash className="text-blue-900" size={20} />
              Quick Mark by Register Number
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Enter the last 3 digits of register numbers (e.g., 135 or 30 for 030). Separate multiple entries with commas or spaces.
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Register Number Suffixes
                </label>
                <input
                  type="text"
                  value={suffixInput}
                  onChange={(e) => setSuffixInput(e.target.value)}
                  placeholder="e.g., 135, 042, 7, 89"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  disabled={!selectedSession}
                />
              </div>
              <div className="min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mark as
                </label>
                <select
                  value={suffixMode}
                  onChange={(e) => setSuffixMode(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  disabled={!selectedSession}
                >
                  <option value="absent">Absent</option>
                  <option value="present">Present</option>
                </select>
              </div>
              <button
                onClick={handleSuffixMark}
                disabled={!selectedSession || suffixLoading || !suffixInput.trim()}
                className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  suffixMode === 'present' 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {suffixLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Marking...
                  </>
                ) : (
                  <>
                    {suffixMode === 'present' ? <Check size={18} /> : <X size={18} />}
                    Mark {suffixMode === 'present' ? 'Present' : 'Absent'}
                  </>
                )}
              </button>
            </div>
            
            {/* Show result of suffix marking */}
            {suffixResult && suffixResult.marked.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Marked {suffixResult.marked.length} student(s) as {suffixMode}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suffixResult.marked.map((s, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {s.roll_no} - {s.student_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <table className="w-full bg-white shadow rounded">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-3 text-left">Roll No</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-center">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b">
                  <td className="p-3">{s.roll_no}</td>
                  <td className="p-3">{s.name}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleAttendance(s.id)}
                      className={`px-3 py-1 rounded ${
                        attendance[s.id] ? "bg-green-100" : "bg-red-200"
                      }`}
                    >
                      {attendance[s.id] ? "Present" : "Absent"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={saveAttendance}
            disabled={loading}
            className={`mt-4 px-6 py-2 text-white rounded shadow ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-900 hover:bg-blue-800"}`}
          >
            {loading ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      )}
    </div>
  );
}
