import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { classSessionAPI, facultyAPI, attendanceAPI, studentAPI } from "../services/api";
import { Calendar, Users, Check, X } from "lucide-react";

export default function MyClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

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
    const response = await classSessionAPI.getByClass(classId);
    setSessions(response.data);
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
    const records = students.map(s => ({
      student_id: s.id,
      status: attendance[s.id] ? "present" : "absent"
    }));

    await attendanceAPI.markAttendance({
      session_id: selectedSession.id,
      records,
      marked_by: user.id
    });

    alert("Updated!");
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => handleSessionSelect(s)}
                className={`border p-4 rounded-lg shadow ${selectedSession?.id === s.id ? "bg-indigo-100" : "bg-white"}`}
              >
                <div className="flex items-center gap-2">
                  <Calendar size={20} />
                  <span>{s.subject_name}</span>
                </div>
                <p className="text-gray-600">{s.date}</p>
                <p className="text-sm">{s.start_time} - {s.end_time}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 – Attendance Table */}
      {selectedSession && (
        <div>
          <h2 className="font-semibold text-xl mb-4">Attendance</h2>

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
            className="mt-4 px-6 py-2 bg-blue-900 text-white rounded shadow"
          >
            Save Attendance
          </button>
        </div>
      )}
    </div>
  );
}
