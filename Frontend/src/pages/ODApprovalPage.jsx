// src/pages/ODApprovalPage.jsx
import { useState, useEffect } from "react";
import { odAPI, studentAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function ODApprovalPage() {
  const { user } = useAuth(); // admin user
  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState(null);

  const submitApprove = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        student_id: parseInt(studentId),
        class_id: parseInt(classId),
        session_id: sessionId ? parseInt(sessionId) : null,
        date,
        reason,
        approved_by: user.id
      };
      const res = await odAPI.approve(payload);
      setMessage({ type: "success", text: "OD approved (id: " + res.data.od_id + ")" });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.error || err.message });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Approve OD Request</h1>

      {message?.text && (
        <div className={`p-3 mb-4 ${message.type === "success" ? "bg-green-100" : "bg-red-100"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={submitApprove} className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl">
        <input placeholder="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} required className="p-2 border" />
        <input placeholder="Class ID" value={classId} onChange={e => setClassId(e.target.value)} required className="p-2 border" />
        <input placeholder="Session ID (optional)" value={sessionId} onChange={e => setSessionId(e.target.value)} className="p-2 border" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="p-2 border" />
        <input placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)} className="p-2 border col-span-2" />
        <button className="px-4 py-2 bg-indigo-600 text-white rounded col-span-2">Approve OD</button>
      </form>
    </div>
  );
}
