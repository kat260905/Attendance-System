import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { attendanceAPI, classSessionAPI } from "../services/api";
import { Save } from "lucide-react";

const FILTER_ORDER = [
  "academicYear",
  "semester",
  "department",
  "section",
  "course",
  "date",
  "hour",
];

export default function AdminAttendanceControls() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [filters, setFilters] = useState({
    academicYear: "",
    semester: "",
    department: "",
    section: "",
    course: "",
    date: "",
    hour: "",
  });
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [edits, setEdits] = useState({});
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoadingSessions(true);
        const response = await classSessionAPI.getAll();
        setSessions(response.data || []);
      } catch (error) {
        console.error("Failed to load sessions:", error);
        setMessage({ type: "error", text: "Failed to load sessions." });
      } finally {
        setLoadingSessions(false);
      }
    };

    loadSessions();
  }, []);

  const getField = (session, keys) => {
    for (const key of keys) {
      const value = session?.[key];
      if (value !== undefined && value !== null && value !== "") {
        return String(value);
      }
    }
    return "";
  };

  const getCourseName = (session) =>
    getField(session, ["subject_name", "course_name", "subject", "course"]);

  const getAcademicYear = (session) =>
    getField(session, ["academic_year", "academicYear", "year"]);

  const getSemester = (session) =>
    getField(session, ["semester", "term"]);

  const getDepartment = (session) =>
    getField(session, ["department", "dept"]);

  const getSection = (session) =>
    getField(session, ["section", "class_section"]);

  const getDate = (session) => session?.date || "";

  const getHour = (session) => (session?.start_time ? session.start_time.slice(0, 5) : "");

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      const index = FILTER_ORDER.indexOf(field);
      for (let i = index + 1; i < FILTER_ORDER.length; i += 1) {
        next[FILTER_ORDER[i]] = "";
      }
      return next;
    });
    setSelectedSessionId("");
    setAttendanceRecords([]);
    setEdits({});
    setMessage(null);
  };

  const matchesFilters = (session) => {
    if (filters.academicYear && getAcademicYear(session) !== filters.academicYear) return false;
    if (filters.semester && getSemester(session) !== filters.semester) return false;
    if (filters.department && getDepartment(session) !== filters.department) return false;
    if (filters.section && getSection(session) !== filters.section) return false;
    if (filters.course && getCourseName(session) !== filters.course) return false;
    if (filters.date && getDate(session) !== filters.date) return false;
    if (filters.hour && getHour(session) !== filters.hour) return false;
    return true;
  };

  const filteredSessions = useMemo(() => sessions.filter(matchesFilters), [sessions, filters]);

  const buildOptions = (items) => {
    const unique = Array.from(new Set(items.filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique;
  };

  const academicYearOptions = useMemo(
    () => buildOptions(sessions.map(getAcademicYear)),
    [sessions]
  );

  const semesterOptions = useMemo(
    () => buildOptions(sessions.filter((s) => !filters.academicYear || getAcademicYear(s) === filters.academicYear)
      .map(getSemester)),
    [sessions, filters.academicYear]
  );

  const departmentOptions = useMemo(
    () => buildOptions(sessions.filter((s) => {
      if (filters.academicYear && getAcademicYear(s) !== filters.academicYear) return false;
      if (filters.semester && getSemester(s) !== filters.semester) return false;
      return true;
    }).map(getDepartment)),
    [sessions, filters.academicYear, filters.semester]
  );

  const sectionOptions = useMemo(
    () => buildOptions(sessions.filter((s) => {
      if (filters.academicYear && getAcademicYear(s) !== filters.academicYear) return false;
      if (filters.semester && getSemester(s) !== filters.semester) return false;
      if (filters.department && getDepartment(s) !== filters.department) return false;
      return true;
    }).map(getSection)),
    [sessions, filters.academicYear, filters.semester, filters.department]
  );

  const courseOptions = useMemo(
    () => buildOptions(sessions.filter((s) => {
      if (filters.academicYear && getAcademicYear(s) !== filters.academicYear) return false;
      if (filters.semester && getSemester(s) !== filters.semester) return false;
      if (filters.department && getDepartment(s) !== filters.department) return false;
      if (filters.section && getSection(s) !== filters.section) return false;
      return true;
    }).map(getCourseName)),
    [sessions, filters.academicYear, filters.semester, filters.department, filters.section]
  );

  const dateOptions = useMemo(
    () => buildOptions(sessions.filter((s) => {
      if (filters.academicYear && getAcademicYear(s) !== filters.academicYear) return false;
      if (filters.semester && getSemester(s) !== filters.semester) return false;
      if (filters.department && getDepartment(s) !== filters.department) return false;
      if (filters.section && getSection(s) !== filters.section) return false;
      if (filters.course && getCourseName(s) !== filters.course) return false;
      return true;
    }).map(getDate)),
    [sessions, filters.academicYear, filters.semester, filters.department, filters.section, filters.course]
  );

  const hourOptions = useMemo(
    () => buildOptions(sessions.filter((s) => {
      if (filters.academicYear && getAcademicYear(s) !== filters.academicYear) return false;
      if (filters.semester && getSemester(s) !== filters.semester) return false;
      if (filters.department && getDepartment(s) !== filters.department) return false;
      if (filters.section && getSection(s) !== filters.section) return false;
      if (filters.course && getCourseName(s) !== filters.course) return false;
      if (filters.date && getDate(s) !== filters.date) return false;
      return true;
    }).map(getHour)),
    [sessions, filters.academicYear, filters.semester, filters.department, filters.section, filters.course, filters.date]
  );

  const sessionOptions = useMemo(
    () => filteredSessions.map((s) => ({
      id: s.id,
      label: `${getCourseName(s) || "Course"} - ${getDate(s) || "Date"} ${getHour(s) ? `(${getHour(s)})` : ""}`
    })),
    [filteredSessions]
  );

  const loadAttendance = async (sessionId) => {
    if (!sessionId) return;
    try {
      setLoadingAttendance(true);
      const response = await attendanceAPI.getSessionAttendance(sessionId);
      setAttendanceRecords(response.data || []);
      setEdits({});
    } catch (error) {
      console.error("Failed to load attendance:", error);
      setMessage({ type: "error", text: "Failed to load attendance." });
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleSessionSelect = async (sessionId) => {
    setSelectedSessionId(sessionId);
    setMessage(null);
    if (!sessionId) {
      setAttendanceRecords([]);
      setEdits({});
      return;
    }
    await loadAttendance(sessionId);
  };

  const getAttendanceId = (record) => record?.attendance_id || record?.id || "";

  const getStudentName = (record) =>
    record?.student_name || record?.name || "Unknown";

  const getRollNo = (record) =>
    record?.roll_no || record?.register_number || record?.reg_no || "-";

  const handleEditChange = (attendanceId, updates) => {
    setEdits((prev) => ({
      ...prev,
      [attendanceId]: {
        status: prev[attendanceId]?.status,
        reason: prev[attendanceId]?.reason || "",
        ...updates,
      }
    }));
  };

  const saveChanges = async () => {
    const changes = Object.entries(edits).filter(([id]) => id);
    if (changes.length === 0) {
      setMessage({ type: "error", text: "No changes to save." });
      return;
    }

    for (const [id, data] of changes) {
      if (!data.reason || !data.reason.trim()) {
        setMessage({ type: "error", text: "Reason is required for all edits." });
        return;
      }
      if (!data.status) {
        setMessage({ type: "error", text: "Status is required for all edits." });
        return;
      }
    }

    try {
      setSaving(true);
      setMessage(null);
      await Promise.all(
        changes.map(([id, data]) =>
          attendanceAPI.updateAttendance(id, {
            status: data.status,
            reason: data.reason,
            changed_by: user?.id,
          })
        )
      );
      setMessage({ type: "success", text: "Attendance updated successfully." });
      await loadAttendance(selectedSessionId);
    } catch (error) {
      console.error("Failed to save attendance changes:", error);
      setMessage({ type: "error", text: "Failed to save attendance changes." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Admin Attendance Controls</h1>
          <p className="text-gray-600 mt-1">
            Filter sessions, view attendance, and make edits with mandatory reasons.
          </p>
        </div>

        {message && (
          <div
            className={`p-3 mb-6 rounded ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          >
            {message.text}
          </div>
        )}

        <div className="mb-6 pb-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filter Structure</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select
                value={filters.academicYear}
                onChange={(e) => handleFilterChange("academicYear", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                disabled={loadingSessions}
              >
                <option value="">All</option>
                {academicYearOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select
                value={filters.semester}
                onChange={(e) => handleFilterChange("semester", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                disabled={loadingSessions}
              >
                <option value="">All</option>
                {semesterOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange("department", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                disabled={loadingSessions}
              >
                <option value="">All</option>
                {departmentOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <select
                value={filters.section}
                onChange={(e) => handleFilterChange("section", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                disabled={loadingSessions}
              >
                <option value="">All</option>
                {sectionOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
              <select
                value={filters.course}
                onChange={(e) => handleFilterChange("course", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                disabled={loadingSessions}
              >
                <option value="">All</option>
                {courseOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <select
                value={filters.date}
                onChange={(e) => handleFilterChange("date", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                disabled={loadingSessions}
              >
                <option value="">All</option>
                {dateOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hour</label>
              <select
                value={filters.hour}
                onChange={(e) => handleFilterChange("hour", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                disabled={loadingSessions}
              >
                <option value="">All</option>
                {hourOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
              <select
                value={selectedSessionId}
                onChange={(e) => handleSessionSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                disabled={loadingSessions || sessionOptions.length === 0}
              >
                <option value="">Select a session...</option>
                {sessionOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">View Existing Attendance</h2>
            <button
              onClick={saveChanges}
              disabled={saving || loadingAttendance}
              className="inline-flex items-center px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              <Save size={18} className="mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {loadingAttendance && (
            <div className="text-sm text-gray-500">Loading attendance...</div>
          )}

          {!loadingAttendance && attendanceRecords.length === 0 && (
            <div className="text-sm text-gray-500">No attendance records to display.</div>
          )}

          {attendanceRecords.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Roll No</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Student Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Reason (required)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendanceRecords.map((record) => {
                    const attendanceId = getAttendanceId(record);
                    const currentStatus = edits[attendanceId]?.status || record.status || "absent";
                    const reason = edits[attendanceId]?.reason || "";
                    const reasonMissing = edits[attendanceId] && !reason.trim();

                    return (
                      <tr key={attendanceId || `${record.student_id}-${record.status}`}>
                        <td className="px-4 py-3 text-sm text-gray-700">{getRollNo(record)}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{getStudentName(record)}</td>
                        <td className="px-4 py-3 text-sm">
                          <select
                            value={currentStatus}
                            onChange={(e) => handleEditChange(attendanceId, { status: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="od">OD</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="text"
                            value={reason}
                            onChange={(e) => handleEditChange(attendanceId, { reason: e.target.value })}
                            placeholder="Required for edits"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent ${
                              reasonMissing ? "border-red-400" : "border-gray-300"
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
