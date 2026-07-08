import { useState, useEffect } from "react";
import { adminODAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Check, X } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import Toast from "../components/Toast";
import socketService from "../services/socket";

const ExpandableReason = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text && text.length > 120; // threshold for long text

  if (!isLong) {
    return <div className="text-sm text-gray-700 mt-2"><strong>Reason:</strong> {text || "—"}</div>;
  }

  return (
    <div className="text-sm text-gray-700 mt-2">
      <strong>Reason:</strong>
      <div className={`mt-1 text-gray-600 ${expanded ? "" : "line-clamp-2"}`}>
        {text}
      </div>
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="text-blue-600 text-xs font-medium mt-1 hover:underline focus:outline-none"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
};

export default function ODApprovalPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState({});

  const [filterDept, setFilterDept] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const uniqueDepts = [...new Set(pending.map(r => r.department).filter(Boolean))];
  const uniqueYears = [...new Set(pending.map(r => r.year).filter(Boolean))];
  const uniqueSections = [...new Set(pending.map(r => r.section).filter(Boolean))];

  const filteredPending = pending.filter(req => {
    const matchDept = filterDept ? req.department === filterDept : true;
    const matchYear = filterYear ? String(req.year) === String(filterYear) : true;
    const matchSection = filterSection ? req.section === filterSection : true;
    const matchSearch = searchQuery ? (
      (req.student_name && req.student_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (req.roll_no && req.roll_no.toLowerCase().includes(searchQuery.toLowerCase()))
    ) : true;
    return matchDept && matchYear && matchSection && matchSearch;
  });

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

    // Listen for real-time updates (e.g. student cancels their request)
    socketService.connect();
    const handleRefresh = () => loadPending();
    socketService.onNotificationsUpdated(handleRefresh);

    return () => {
      socketService.offNotificationsUpdated(handleRefresh);
    };
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">OD Approval</h1>
      </div>

      <p className="text-gray-600 mb-4">
        Student OD requests appear here. Approve to forward to the faculty for attendance marking.
      </p>

      {/* Filter Bar */}
      {pending.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6 shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Search Student</label>
            <input 
              type="text" 
              placeholder="Name or Register Number..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="w-full md:w-32">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Dept</label>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All</option>
              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="w-full md:w-32">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All</option>
              {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="w-full md:w-32">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Section</label>
            <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All</option>
              {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button 
            onClick={() => { setFilterDept(""); setFilterYear(""); setFilterSection(""); setSearchQuery(""); }}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading OD requests..." />
      ) : pending.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">No pending OD requests from students.</p>
        </div>
      ) : filteredPending.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">No requests match your current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPending.map(req => {
            const dateRangeText = req.from_date !== req.to_date
              ? `${req.from_date} to ${req.to_date}`
              : req.from_date;

            return (
            <div
              key={req.id}
              className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="flex-1">
                <div className="text-lg text-gray-800 mb-2">
                  <strong>{req.student_name || "Unknown Student"}</strong>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  {req.department && <p><span className="font-medium">Dept:</span> {req.department}</p>}
                  {req.year && <p><span className="font-medium">Year:</span> {req.year}</p>}
                  {req.section && <p><span className="font-medium">Section:</span> {req.section}</p>}
                  {req.roll_no && <p><span className="font-medium">Register number:</span> {req.roll_no}</p>}
                </div>
                <div className="text-sm font-medium text-blue-800 mt-2 mb-1 bg-blue-50 border border-blue-100 inline-block px-3 py-1 rounded">
                  Requested Dates: {dateRangeText}
                </div>
                <ExpandableReason text={req.reason} />
                
                {req.supporting_document && (
                  <div className="text-sm text-gray-700 mt-3">
                    <button
                      onClick={() => handleDownloadDocument(req.id, req.supporting_document.split('/').pop())}
                      className="flex items-center text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded hover:bg-indigo-50 transition-colors"
                    >
                      View Supporting Document
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">Requested: {new Date(req.requested_at + "Z").toLocaleString("en-IN", {
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
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200 w-full md:max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rejection remarks (optional)</label>
                  <input
                    type="text"
                    value={rejectRemarks[req.id] || ""}
                    onChange={(e) => setRejectRemarks(prev => ({ ...prev, [req.id]: e.target.value }))}
                    placeholder="Reason for rejection..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(req)}
                      disabled={actionLoading === req.id}
                      className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => setRejectRemarks(prev => ({ ...prev, [req.id]: undefined }))}
                      className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0 shrink-0">
                <button
                  onClick={() => handleApprove(req)}
                  disabled={actionLoading === req.id}
                  className="flex-1 md:flex-none inline-flex justify-center items-center gap-2 px-6 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 font-medium transition-colors"
                >
                  <Check size={18} />
                  Approve
                </button>
                {rejectRemarks[req.id] === undefined ? (
                  <button
                    onClick={() => setRejectRemarks(prev => ({ ...prev, [req.id]: "" }))}
                    disabled={actionLoading === req.id}
                    className="flex-1 md:flex-none inline-flex justify-center items-center gap-2 px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 font-medium transition-colors"
                  >
                    <X size={18} />
                    Reject
                  </button>
                ) : null}
              </div>
            </div>
            );
          })}
        </div>
      )}
      <Toast message={message} onDismiss={() => setMessage(null)} />
    </div>
  );
}
