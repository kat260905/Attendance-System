// src/pages/ODPendingPage.jsx
import { useState, useEffect } from "react";
import { odAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import Toast from "../components/Toast";

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

export default function ODPendingPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const [filterDept, setFilterDept] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleApplyGroup = async (items) => {
    try {
      setLoading(true);
      // Process all items in this grouped request
      for (const item of items) {
        await odAPI.apply(item.id, { faculty_id: user.faculty_id });
      }
      setMsg({ type: "success", text: "OD applied for all selected dates." });
      await loadPending();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || err.message });
      await loadPending(); // Reload to get updated state if partially applied
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

  // Group by student_request_id so multi-day ODs appear as a single summary block
  const groupedRequests = pending.reduce((acc, p) => {
    // If it lacks a student_request_id (legacy/manual), isolate it by its row ID
    const key = p.student_request_id || `single-${p.id}`;
    if (!acc[key]) {
      acc[key] = {
        key: key,
        student_id: p.student_id,
        student_name: p.student_name,
        roll_no: p.roll_no,
        department: p.department,
        year: p.year,
        section: p.section,
        class_id: p.class_id,
        reason: p.reason,
        supporting_document: p.supporting_document,
        student_request_id: p.student_request_id,
        dates: [],
        items: [] // hold raw p objects
      };
    }
    acc[key].dates.push(p.date);
    acc[key].items.push(p);
    return acc;
  }, {});

  const groupedList = Object.values(groupedRequests).sort((a, b) => new Date(a.from_date) - new Date(b.from_date));

  const uniqueDepts = [...new Set(groupedList.map(r => r.department).filter(Boolean))];
  const uniqueYears = [...new Set(groupedList.map(r => r.year).filter(Boolean))];
  const uniqueSections = [...new Set(groupedList.map(r => r.section).filter(Boolean))];

  const filteredList = groupedList.filter(group => {
    const matchDept = filterDept ? group.department === filterDept : true;
    const matchYear = filterYear ? String(group.year) === String(filterYear) : true;
    const matchSection = filterSection ? group.section === filterSection : true;
    const matchSearch = searchQuery ? (
      (group.student_name && group.student_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (group.roll_no && group.roll_no.toLowerCase().includes(searchQuery.toLowerCase()))
    ) : true;
    return matchDept && matchYear && matchSection && matchSearch;
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sync Approved ODs</h1>
      <p className="text-gray-600 mb-6">Review administrator-approved OD requests and sync them to your class attendance records.</p>
      
      {/* Filter Bar */}
      {groupedList.length > 0 && (
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

      {loading ? <p>Loading...</p> : (
        <div className="space-y-4">
          {groupedList.length === 0 ? <p>No pending OD requests.</p> : 
           filteredList.length === 0 ? <p>No requests match your current filters.</p> : (
            filteredList.map(group => {
              // Sort dates to show range properly
              group.dates.sort();
              const dateRangeText = group.dates.length > 1
                ? `${group.dates[0]} to ${group.dates[group.dates.length - 1]} (${group.dates.length} days)`
                : group.dates[0];

              return (
                <div key={group.key} className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <div className="text-lg text-gray-800 mb-2">
                      <strong>{group.student_name || "Unknown Student"}</strong>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {group.department && <p><span className="font-medium">Dept:</span> {group.department}</p>}
                      {group.year && <p><span className="font-medium">Year:</span> {group.year}</p>}
                      {group.section && <p><span className="font-medium">Section:</span> {group.section}</p>}
                      {group.roll_no && <p><span className="font-medium">Register number:</span> {group.roll_no}</p>}
                    </div>
                    <div className="text-sm font-medium text-blue-800 mt-1 mb-1 bg-blue-50 border border-blue-100 inline-block px-3 py-1 rounded">
                      Approved Dates: {dateRangeText}
                    </div>
                    <ExpandableReason text={group.reason} />
                    
                    {group.supporting_document && group.student_request_id && (
                      <div className="text-sm text-gray-700 mt-3">
                        <button
                          onClick={() => handleDownloadDocument(group.student_request_id, group.supporting_document.split('/').pop())}
                          className="flex items-center text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded hover:bg-indigo-50 transition-colors"
                        >
                          View Supporting Document
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex shrink-0 w-full md:w-auto">
                    <button 
                      onClick={() => handleApplyGroup(group.items)} 
                      className="w-full md:w-auto px-5 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-md transition-colors duration-200 shadow-sm"
                    >
                      {group.dates.length > 1 ? `Sync All ${group.dates.length} Days` : 'Sync to Attendance'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      <Toast message={msg} onDismiss={() => setMsg(null)} />
    </div>
  );
}
