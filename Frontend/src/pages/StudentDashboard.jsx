import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { studentODAPI } from '../services/api';
import {
    RefreshCw, TrendingUp, BookOpen, CheckCircle, XCircle, Clock,
    FileText, Upload, Calendar, User, AlertTriangle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const ExpandableReason = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text && text.length > 120;

  if (!isLong) {
    return <p className="text-sm text-gray-700 mt-1">{text || "—"}</p>;
  }

  return (
    <div className="mt-1">
      <div className={`text-sm text-gray-700 ${expanded ? "" : "line-clamp-2"}`}>
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

export default function StudentDashboard({ section = 'dashboard' }) {
    const { user } = useAuth();
    const studentId = user?.student_id || user?.id;

    const [attendanceSummary, setAttendanceSummary] = useState(null);
    const [subjectBreakdown, setSubjectBreakdown] = useState([]);
    const [odRequests, setODRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // OD Request Form
    const [odForm, setODForm] = useState({
        from_date: '',
        to_date: '',
        reason: '',
        supporting_document: null
    });

    useEffect(() => {
        if (studentId) fetchDashboardData();
    }, [studentId]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [summaryRes, requestsRes] = await Promise.all([
                studentODAPI.getAttendanceSummary(studentId),
                studentODAPI.getMyRequests(studentId)
            ]);

            setAttendanceSummary(summaryRes.data.overall || summaryRes.data);
            setSubjectBreakdown(summaryRes.data.by_subject || []);
            setODRequests(requestsRes.data);
        } catch (err) {
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleODSubmit = async (e) => {
        e.preventDefault();
        if (!odForm.from_date || !odForm.to_date || !odForm.reason) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            let payload;
            if (odForm.supporting_document) {
                const formData = new FormData();
                formData.append('student_id', studentId);
                formData.append('from_date', odForm.from_date);
                formData.append('to_date', odForm.to_date);
                formData.append('reason', odForm.reason);
                formData.append('supporting_document', odForm.supporting_document);
                payload = formData;
            } else {
                payload = {
                    student_id: studentId,
                    from_date: odForm.from_date,
                    to_date: odForm.to_date,
                    reason: odForm.reason
                };
            }
            await studentODAPI.submitRequest(payload);
            setSuccess('OD request submitted successfully!');
            setODForm({ from_date: '', to_date: '', reason: '', supporting_document: null });
            fetchDashboardData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit OD request');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to cancel this request?')) return;
        try {
            setLoading(true);
            await studentODAPI.cancelRequest(requestId, studentId);
            setSuccess('Request cancelled successfully');
            fetchDashboardData();
        } catch (err) {
            setError('Failed to cancel request');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadDocument = async (requestId, fileName) => {
        try {
            const response = await studentODAPI.downloadDocument(requestId);
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
            setError('Failed to download document');
        }
    };

    const getStatusStyle = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            applied: 'bg-blue-100 text-blue-800',
            cancelled: 'bg-gray-100 text-gray-800',
        };
        return styles[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading && !attendanceSummary) {
        return <LoadingSpinner text="Loading dashboard..." />;
    }

    // Page titles per section
    const pageTitles = {
        dashboard: { title: 'Dashboard', subtitle: 'Attendance overview & analytics' },
        'apply-od': { title: 'Apply for OD', subtitle: 'Submit your On-Duty request' },
        requests: { title: 'My OD Requests', subtitle: 'Track your OD request statuses' },
        sessions: { title: 'Upcoming Classes', subtitle: 'Next 7 days schedule' },
    };

    const { title, subtitle } = pageTitles[section] || pageTitles.dashboard;

    return (
        <>
            <div className="p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Page Header */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                                <p className="text-gray-600 mt-2">{subtitle}</p>
                            </div>
                        </div>
                    </div>



                    {/* ===== DASHBOARD SECTION ===== */}
                    {section === 'dashboard' && attendanceSummary && (
                        <div className="space-y-6">
                            {/* Top Section - Main Indicator & Alerts */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Big Circular Indicator */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                                    {/* Decorative background blur based on percentage */}
                                    {/* <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-20 ${attendanceSummary.percentage >= 75 ? 'bg-green-400' :
                                        attendanceSummary.percentage >= 65 ? 'bg-yellow-400' : 'bg-red-400'
                                    }`} /> */}

                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6 relative z-10">Overall Attendance</h3>

                                    <div className="relative flex items-center justify-center w-48 h-48 mb-4">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                            {/* Background Circle */}
                                            <circle
                                                cx="50" cy="50" r="45"
                                                fill="transparent"
                                                stroke="#f3f4f6"
                                                strokeWidth="8"
                                            />
                                            {/* Progress Circle */}
                                            <circle
                                                cx="50" cy="50" r="45"
                                                fill="transparent"
                                                stroke={
                                                    attendanceSummary.percentage >= 75 ? '#22c55e' :
                                                        attendanceSummary.percentage >= 65 ? '#eab308' : '#ef4444'
                                                }
                                                strokeWidth="8"
                                                strokeDasharray={`${2 * Math.PI * 45}`}
                                                strokeDashoffset={`${2 * Math.PI * 45 * (1 - attendanceSummary.percentage / 100)}`}
                                                strokeLinecap="round"
                                                className="transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute flex flex-col items-center justify-center text-center">
                                            <span className={`text-4xl font-extrabold tracking-tight ${attendanceSummary.percentage >= 75 ? 'text-green-600' :
                                                attendanceSummary.percentage >= 65 ? 'text-yellow-600' : 'text-red-600'
                                                }`}>
                                                {attendanceSummary.percentage}%
                                            </span>
                                            <span className="text-xs text-gray-500 mt-1 font-medium">{attendanceSummary.present} / {attendanceSummary.total} Classes</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Alerts & Quick Summary */}
                                <div className="lg:col-span-2 flex flex-col gap-4">
                                    {/* Alert Box */}
                                    {(() => {
                                        if (!subjectBreakdown || subjectBreakdown.length === 0) return null;

                                        const requiredPercentage = 75;

                                        // Find subjects below 75%
                                        const criticalSubjects = subjectBreakdown.filter(s => s.percentage < requiredPercentage);

                                        // Find subjects between 75% and 80%
                                        const borderlineSubjects = subjectBreakdown.filter(s => s.percentage >= requiredPercentage && s.percentage < 80);

                                        if (criticalSubjects.length > 0) {
                                            return (
                                                <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex gap-4 h-full animate-[slideIn_0.3s_ease]">
                                                    <div className="bg-red-100 p-3 rounded-full h-fit flex-shrink-0">
                                                        <AlertTriangle className="text-red-600" size={24} />
                                                    </div>
                                                    <div className="w-full flex flex-col">
                                                        <h3 className="text-lg font-bold text-red-800 tracking-tight">Warning: Shortage of Attendance</h3>
                                                        <p className="text-red-700 mt-1 mb-3">
                                                            You have below 75% attendance in the following subjects:
                                                        </p>
                                                        <div className="space-y-2 overflow-y-auto max-h-[160px] pr-2 custom-scrollbar">
                                                            {criticalSubjects.map(subject => {
                                                                const totalPresent = subject.present + subject.od;
                                                                // Math formula: (Present + X) / (Total + X) = 0.75
                                                                const classesNeeded = Math.ceil((0.75 * subject.total - totalPresent) / 0.25);

                                                                return (
                                                                    <div key={subject.subject_id} className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 bg-white rounded-md border border-red-100 shadow-sm shrink-0">
                                                                        <span className="font-semibold text-gray-900">{subject.subject_name} ({subject.percentage}%)</span>
                                                                        <span className="text-red-700 text-sm font-medium mt-1 sm:mt-0">
                                                                            Needs {classesNeeded} more class{classesNeeded !== 1 ? 'es' : ''}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        } else if (borderlineSubjects.length > 0) {
                                            return (
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex gap-4">
                                                    <div className="bg-yellow-100 p-3 rounded-full h-fit flex-shrink-0">
                                                        <AlertTriangle className="text-yellow-600" size={24} />
                                                    </div>
                                                    <div className="w-full">
                                                        <h3 className="text-lg font-bold text-yellow-800 tracking-tight">Caution: Borderline Attendance</h3>
                                                        <p className="text-yellow-700 mt-1 mb-2">
                                                            You are dangerously close to falling below 75% in some subjects:
                                                        </p>
                                                        <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                                                            {borderlineSubjects.map(subject => (
                                                                <li key={subject.subject_id}>
                                                                    <strong>{subject.subject_name}</strong> – {subject.percentage}%
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex gap-4">
                                                    <div className="bg-green-100 p-3 rounded-full h-fit">
                                                        <CheckCircle className="text-green-600" size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-green-800 tracking-tight">Great job!</h3>
                                                        <p className="text-green-700 mt-1">Your attendance is well above the required threshold. Keep it up!</p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })()}

                                    {/* Quick Stats Row */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 shrink-0 flex flex-col justify-center">
                                            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Total Sessions</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">{attendanceSummary.total}</p>
                                        </div>
                                        <div className="bg-white rounded-xl shadow-sm border border-green-100 p-4 shrink-0 flex flex-col justify-center">
                                            <p className="text-xs text-green-700 uppercase tracking-widest font-semibold flex items-center gap-1"><CheckCircle size={12} /> Present</p>
                                            <p className="text-2xl font-bold text-green-800 mt-1">{attendanceSummary.present}</p>
                                        </div>
                                        <div className="bg-white rounded-xl shadow-sm border border-red-100 p-4 shrink-0 flex flex-col justify-center">
                                            <p className="text-xs text-red-700 uppercase tracking-widest font-semibold flex items-center gap-1"><XCircle size={12} /> Absent</p>
                                            <p className="text-2xl font-bold text-red-800 mt-1">{attendanceSummary.absent}</p>
                                        </div>
                                        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 shrink-0 flex flex-col justify-center">
                                            <p className="text-xs text-blue-700 uppercase tracking-widest font-semibold flex items-center gap-1"><Clock size={12} /> On Duty</p>
                                            <p className="text-2xl font-bold text-blue-800 mt-1">{attendanceSummary.od}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Subject-wise Breakdown Table */}
                            {subjectBreakdown.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-5 border-b border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900 tracking-tight">Subject-wise Breakdown</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50/50">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                                                    <th scope="col" className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                                    <th scope="col" className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Present</th>
                                                    <th scope="col" className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">%</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                                {subjectBreakdown.map((subject, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {subject.subject_name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                            {subject.total}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                            {subject.present + subject.od}
                                                            {subject.od > 0 && <span className="ml-1 text-xs text-blue-500">(+{subject.od} OD)</span>}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${subject.percentage >= 75 ? 'bg-green-100 text-green-800' :
                                                                subject.percentage >= 65 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {subject.percentage >= 75 ? 'Safe' : subject.percentage >= 65 ? 'Warning' : 'Critical'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <span className={`text-sm font-bold ${subject.percentage >= 75 ? 'text-green-600' :
                                                                subject.percentage >= 65 ? 'text-yellow-600' : 'text-red-600'
                                                                }`}>
                                                                {subject.percentage}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== APPLY OD SECTION ===== */}
                    {section === 'apply-od' && (
                        <div className="bg-white rounded-lg shadow p-8 max-w-2xl mx-auto mt-6">
                            <form onSubmit={handleODSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">From Date <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            value={odForm.from_date}
                                            onChange={(e) => setODForm({ ...odForm, from_date: e.target.value })}
                                            required
                                            min={new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]}
                                            max={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">To Date <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            value={odForm.to_date}
                                            onChange={(e) => setODForm({ ...odForm, to_date: e.target.value })}
                                            required
                                            min={odForm.from_date || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]}
                                            max={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Reason <span className="text-red-500">*</span></label>
                                    <textarea
                                        value={odForm.reason}
                                        onChange={(e) => setODForm({ ...odForm, reason: e.target.value })}
                                        required
                                        rows={8}
                                        placeholder="Please provide a detailed reason for your OD request..."
                                        maxLength={1000}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none transition-shadow"
                                    />
                                    <div className="text-right text-xs text-gray-500 mt-1 font-medium">{odForm.reason.length}/1000 characters</div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Supporting Document <span className="text-red-500">*</span></label>
                                    <div className="mt-1 flex justify-center px-6 pt-6 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group cursor-pointer relative">
                                        <input
                                            type="file"
                                            required
                                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                            onChange={(e) => setODForm({ ...odForm, supporting_document: e.target.files?.[0] || null })}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="space-y-2 text-center pointer-events-none">
                                            <Upload className="mx-auto h-10 w-10 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                            <div className="text-sm text-gray-600 block">
                                                <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                                            </div>
                                            <p className="text-xs text-gray-500">PDF, PNG, JPG, DOC up to 5MB</p>
                                        </div>
                                    </div>
                                    {odForm.supporting_document && (
                                        <p className="mt-2 text-sm text-green-600 font-semibold flex items-center justify-center gap-2 bg-green-50 py-2 rounded-md">
                                            <CheckCircle size={16} />
                                            {odForm.supporting_document.name}
                                        </p>
                                    )}
                                </div>

                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 mt-4">
                                    <p className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                                        <AlertTriangle size={16} /> Important Notes
                                    </p>
                                    <ul className="text-sm text-blue-800 space-y-2 list-none pl-1">
                                        <li className="flex items-start gap-2">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block flex-shrink-0"></div>
                                            <span>Request OD for dates up to <strong>7 days in the past</strong> or <strong>30 days in the future</strong>.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block flex-shrink-0"></div>
                                            <span>Requests are sent to the administrator for review.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block flex-shrink-0"></div>
                                            <span>Once approved, faculty will mark your attendance as OD automatically.</span>
                                        </li>
                                    </ul>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 mt-4 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors text-base font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading && <LoadingSpinner size={18} inline={true} />}
                                    {loading ? 'Submitting...' : 'Submit OD Request'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ===== MY OD REQUESTS SECTION ===== */}
                    {section === 'requests' && (
                        <div>
                            {odRequests.length === 0 ? (
                                <div className="bg-white rounded-lg shadow p-12 text-center">
                                    <FileText className="mx-auto text-gray-400 mb-4" size={40} />
                                    <p className="text-gray-500 mb-4">You haven't submitted any OD requests yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {odRequests.map(req => (
                                        <div key={req.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusStyle(req.status)}`}>
                                                    {req.status}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    Requested: {new Date((req.created_at || req.requested_at) + "Z").toLocaleString("en-IN", {
                                                        timeZone: "Asia/Kolkata",
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        hour12: true
                                                    })}
                                                </span>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</p>
                                                    <p className="text-sm text-gray-900 mt-1">
                                                        {req.from_date && req.to_date && req.from_date !== req.to_date
                                                            ? `${new Date(req.from_date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })} – ${new Date(req.to_date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })}`
                                                            : new Date(req.date || req.from_date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })
                                                        }
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</p>
                                                    <ExpandableReason text={req.reason} />
                                                </div>

                                                {req.supporting_document && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Document</p>
                                                        <button
                                                            onClick={() => handleDownloadDocument(req.id, req.supporting_document.split('/').pop())}
                                                            className="inline-flex items-center gap-1 mt-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                                                        >
                                                            <FileText size={14} /> View Document
                                                        </button>
                                                    </div>
                                                )}

                                                {req.reviewed_at && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reviewed</p>
                                                        <p className="text-sm text-gray-700 mt-1">{new Date(req.reviewed_at + "Z").toLocaleString("en-IN", {
                                                            timeZone: "Asia/Kolkata",
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            hour12: true
                                                        })}</p>
                                                        {req.admin_notes && (
                                                            <p className="text-sm text-gray-600 mt-1 italic">"{req.admin_notes}"</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {
                                                req.status === 'pending' && (
                                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                                        <button
                                                            onClick={() => handleCancelRequest(req.id)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                                                        >
                                                            Cancel Request
                                                        </button>
                                                    </div>
                                                )
                                            }
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div >
            <Toast
                message={
                    error ? { type: "error", text: error } : success ? { type: "success", text: success } : null
                }
                onDismiss={() => {
                    setError(null);
                    setSuccess(null);
                }}
            />
        </>
    );
}
