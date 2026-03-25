import { useState, useEffect } from "react";
import { adminODAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Check, X, RefreshCw } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import Toast from "../components/Toast";

export default function ODApprovalPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState({});

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await adminODAPI.getPendingRequests();
      setPending(res.data);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || err.message });
      setPending([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (req) => {
    setActionLoading(req.id);
    try {
      await adminODAPI.approveRequest(req.id, { approved_by: user.id });
      setMessage({ type: "success", text: `OD request from ${req.student_name} approved. Faculty will be notified to apply.` });
      await loadPending();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (req) => {
    const remarks = rejectRemarks[req.id] || "";
    setActionLoading(req.id);
    try {
      await adminODAPI.rejectRequest(req.id, {
        rejected_by: user.id,
        remarks: remarks
      });
      setMessage({ type: "success", text: `OD request from ${req.student_name} rejected.` });
      setRejectRemarks(prev => ({ ...prev, [req.id]: "" }));
      await loadPending();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadDocument = async (requestId, fileName) => {
    try {
      const response = await adminODAPI.downloadDocument(requestId);
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
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to download document" });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">OD Approval</h1>
        <button
          onClick={loadPending}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <p className="text-gray-600 mb-4">
        Student OD requests appear here. Approve to forward to the faculty for attendance marking.
      </p>



      {loading ? (
        <LoadingSpinner text="Loading OD requests..." />
      ) : pending.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">No pending OD requests from students.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((req) => (
            <div
              key={req.id}
              className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">{req.student_name}</span>
                    <span className="text-sm text-gray-500">({req.roll_no})</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-medium">Class:</span> {req.class_info || `ID ${req.class_id}`}
                    </p>
                    <p>
                      <span className="font-medium">Date range:</span> {req.from_date} to {req.to_date}
                    </p>
                    <p>
                      <span className="font-medium">Reason:</span> {req.reason}
                    </p>
                    {req.supporting_document && (
                      <p>
                        <span className="font-medium">Supporting Document:</span>{" "}
                        <button
                          onClick={() => handleDownloadDocument(req.id, req.supporting_document.split('/').pop())}
                          className="text-indigo-600 hover:text-indigo-800 underline cursor-pointer transition-colors"
                        >
                          View Document
                        </button>
                      </p>
                    )}
                    <p className="text-gray-500">Requested: {new Date(req.requested_at + "Z").toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true
                    })}</p>
                  </div>
                  {rejectRemarks[req.id] !== undefined && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rejection remarks (optional)</label>
                      <input
                        type="text"
                        value={rejectRemarks[req.id] || ""}
                        onChange={(e) => setRejectRemarks(prev => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="Reason for rejection..."
                        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(req)}
                          disabled={actionLoading === req.id}
                          className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => setRejectRemarks(prev => ({ ...prev, [req.id]: undefined }))}
                          className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(req)}
                    disabled={actionLoading === req.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 font-medium"
                  >
                    <Check size={18} />
                    Approve
                  </button>
                  {rejectRemarks[req.id] === undefined ? (
                    <button
                      onClick={() => setRejectRemarks(prev => ({ ...prev, [req.id]: "" }))}
                      disabled={actionLoading === req.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 font-medium"
                    >
                      <X size={18} />
                      Reject
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Toast message={message} onDismiss={() => setMessage(null)} />
    </div>
  );
}
