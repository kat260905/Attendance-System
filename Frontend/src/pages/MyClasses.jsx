import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { classSessionAPI, facultyAPI, attendanceAPI, studentAPI } from "../services/api";
import { Calendar, Users, Check, X, ChevronDown, ChevronRight } from "lucide-react";

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
            //   className={`p-4 rounded-lg shadow border ${selectedClass === c.class_id ? "bg-indigo-200" : "bg-white"}`}
            // className={`${selectedClass === c.class_id ? "bg-indigo-200" : "bg-white"} 
            //   p-4 rounded-lg shadow border`}

            className={`${selectedClass === c.class_id ? "bg-indigo-200" : "bg-white"} 
              p-4 rounded-lg shadow border`}
            
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
                      <Calendar size={18} className="text-indigo-600" />
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
                            selectedSession?.id === s.id ? "bg-indigo-50 border-l-4 border-indigo-500" : ""
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
                              <Check size={20} className="text-indigo-600" />
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
