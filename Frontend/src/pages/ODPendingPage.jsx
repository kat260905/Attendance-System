// src/pages/ODPendingPage.jsx
import { useState, useEffect } from "react";
import { odAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function ODPendingPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await odAPI.getPending(user.faculty_id);
      setPending(res.data);
    } catch (err) {
      console.error(err);
      setPending([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.faculty_id) loadPending();
  }, [user]);

  const handleApply = async (odId) => {
    try {
      await odAPI.apply(odId, { faculty_id: user.faculty_id });
      setMsg({ type: "success", text: "OD applied." });
      await loadPending();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || err.message });
    }
  };

  const handleDownloadDocument = async (requestId, fileName) => {
    try {
      const response = await odAPI.downloadDocument(requestId);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `OD_Document_${requestId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to download document" });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pending OD Requests</h1>
      {msg && <div className={`p-2 mb-3 ${msg.type === "success" ? "bg-green-100" : "bg-red-100"}`}>{msg.text}</div>}
      {loading ? <p>Loading...</p> : (
        <div className="space-y-3">
          {pending.length === 0 ? <p>No pending OD requests.</p> : (
            pending.map(p => (
              <div key={p.id} className="p-3 border rounded flex justify-between items-center">
                <div>
                  <div><strong>{p.student_name || p.student_id}</strong> (student_id: {p.student_id})</div>
                  <div className="text-sm text-gray-600">Date: {p.date} / Class: {p.class_id} / Session: {p.session_id || "-"}</div>
                  <div className="text-sm text-gray-700">Reason: {p.reason || "—"}</div>
                  {p.supporting_document && p.student_request_id && (
                    <div className="text-sm text-gray-700">
                      Supporting Document:{" "}
                      <button
                        onClick={() => handleDownloadDocument(p.student_request_id, p.supporting_document.split('/').pop())}
                        className="text-indigo-600 hover:text-indigo-800 underline"
                      >
                        View Document
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApply(p.id)} className="px-3 py-1 bg-blue-600 text-white rounded">Apply OD</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
