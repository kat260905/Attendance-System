import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { classSessionAPI, facultyAPI, attendanceAPI, studentAPI } from "../services/api";
import { Calendar, Check, X, Hash, Save, Download } from "lucide-react";
import Toast from "../components/Toast";

export default function MyClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
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

    // Return sorted dates
    return Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
  }, [sessions]);

  // Get available dates for date picker
  const availableDates = sessionsByDate;



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

  const handleClassSelect = async (classId, subjectId) => {
    setSelectedClass({ classId, subjectId });
    setSelectedDate(null);
    setSelectedSession(null);
    const response = await classSessionAPI.getByClass(classId, user.faculty_id);

    // Filter sessions to only show the selected subject
    const filteredSessions = response.data.filter(s => s.subject_id === subjectId);
    setSessions(filteredSessions);

    // Set default date to the first available date or today
    if (filteredSessions.length > 0) {
      const dates = [...new Set(filteredSessions.map(s => s.date))].sort((a, b) => new Date(a) - new Date(b));
      const today = new Date().toISOString().split('T')[0];
      const defaultDate = dates.includes(today) ? today : dates[0];
      setSelectedDate(defaultDate);
    }
  };

  const handleSessionSelect = async (session) => {
    setSelectedSession(session);
    const resStudents = await studentAPI.getBySession(session.id);
    setStudents(resStudents.data);

    const resAttendance = await attendanceAPI.getSessionAttendance(session.id);
    const attMap = {};
    resAttendance.data.forEach(a => {
      attMap[a.student_id] = a.status || "absent";
    });
    setAttendance(attMap);
  };

  const getSessionsForDate = (date) => {
    if (!date) return [];
    return sessions
      .filter(s => s.date === date)
      .sort((a, b) => {
        if (a.start_time && b.start_time) {
          return a.start_time.localeCompare(b.start_time);
        }
        return 0;
      });
  };

  const toggleAttendance = (studentId) => {
    setAttendance(prev => {
      const current = prev[studentId] || "absent";
      if (current === "od") {
        return prev;
      }
      return { ...prev, [studentId]: current === "present" ? "absent" : "present" };
    });
  };

  const markAllPresent = () => {
    const allPresent = { ...attendance };
    students.forEach(student => {
      if ((attendance[student.id] || "absent") !== "od") {
        allPresent[student.id] = "present";
      }
    });
    setAttendance(allPresent);
  };

  const markAllAbsent = () => {
    const allAbsent = { ...attendance };
    students.forEach(student => {
      if ((attendance[student.id] || "absent") !== "od") {
        allAbsent[student.id] = "absent";
      }
    });
    setAttendance(allAbsent);
  };

  const presentCount = students.filter(s => (attendance[s.id] || "absent") === "present").length;
  const odCount = students.filter(s => (attendance[s.id] || "absent") === "od").length;
  const absentCount = students.length - presentCount - odCount;

  const saveAttendance = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        status: attendance[s.id] || "absent"
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

  const exportAttendance = async () => {
    if (!selectedSession) {
      setMessage({ type: "error", text: "Please select a class session first." });
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
      setMessage({ type: "error", text: "Failed to export attendance. Please try again." });
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
        newAttendance[record.student_id] = suffixMode;
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
              key={`${c.class_id}-${c.subject_id}`}
              onClick={() => handleClassSelect(c.class_id, c.subject_id)}
              className={`${selectedClass?.classId === c.class_id && selectedClass?.subjectId === c.subject_id ? "bg-blue-100" : "bg-white"} 
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

      {/* Step 2 – Select Date */}
      {selectedClass && (
        <div className="mb-6">
          <h2 className="font-semibold text-xl mb-3">Select Date</h2>
          <div>
            <input
              type="date"
              value={selectedDate || ''}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSession(null);
              }}
              min={availableDates.length > 0 ? availableDates[0] : ''}
              max={availableDates.length > 0 ? availableDates[availableDates.length - 1] : ''}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            />
            {/* {availableDates.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Available dates: {availableDates.map(d => formatDate(d)).join(', ')}
              </p>
            )} */}
          </div>
        </div>
      )}

      {/* Step 3 – Select Class Session */}
      {selectedClass && selectedDate && (
        <div className="mb-6">
          <h2 className="font-semibold text-xl mb-3">Sessions on {formatDate(selectedDate)}</h2>
          {getSessionsForDate(selectedDate).length === 0 ? (
            <p className="text-gray-500">No sessions found for this date.</p>
          ) : (
            <div className="space-y-2">
              {getSessionsForDate(selectedDate).map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSessionSelect(s)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedSession?.id === s.id
                    ? "bg-blue-50 border-blue-900 border-2"
                    : "bg-white border-gray-200 hover:bg-gray-50"
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
      )}

      {/* Step 4 – Attendance Table */}
      {selectedSession && (
        <div>
          <h2 className="font-semibold text-xl mb-4">Attendance</h2>



          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
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
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-gray-500 rounded-full p-2">
                  <Calendar className="text-white" size={24} />
                </div>
                <div>
                  <div className="text-sm text-black-800">OD</div>
                  <div className="text-2xl font-bold text-black-800">{odCount}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Mark by Register Number Suffix */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Hash className="text-blue-900" size={20} />
              Quick Mark by Register Number
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Enter the last 3 digits of register numbers (e.g., 135 or 30 for 030). Separate multiple entries with commas or spaces. You can also specify ranges (e.g., 1-30).
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
                  placeholder="e.g., 135, 042, 7, 89, 45-102"
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
                className="px-6 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-900 text-white hover:bg-blue-800"
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
                    <span
                      key={idx}
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${suffixMode === 'present'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {s.roll_no} - {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <div className="flex gap-3">
                <button
                  onClick={markAllPresent}
                  className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2"
                >
                  <Check size={18} />
                  Mark All Present
                </button>
                <button
                  onClick={markAllAbsent}
                  className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2"
                >
                  <X size={18} />
                  Mark All Absent
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={exportAttendance}
                  disabled={!selectedSession}
                  className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} />
                  Export CSV
                </button>
                <button
                  onClick={saveAttendance}
                  disabled={loading}
                  className="px-6 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  {loading ? 'Saving...' : 'Submit Attendance'}
                </button>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="overflow-hidden mb-6">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Roll No</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Student Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Department</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Present/Absent</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">OD</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  (() => {
                    const status = attendance[student.id] || "absent";
                    const isOD = status === "od";
                    return (
                      <tr
                        key={student.id}
                        className={`border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
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
                            checked={status === "present"}
                            onChange={() => toggleAttendance(student.id)}
                            disabled={isOD}
                            className="w-5 h-5 text-blue-900 rounded checked:bg-green-600 focus:ring-2 focus:ring-blue-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isOD ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              ✓
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {status === "present" ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Present
                            </span>
                          ) : status === "od" ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              OD
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                              Absent
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })()
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
      <Toast message={message} onDismiss={() => setMessage(null)} />
    </div>
  );
}
