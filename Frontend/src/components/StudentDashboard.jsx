import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { studentODAPI, studentAPI } from '../services/api';
import './StudentDashboard.css';

/**
 * Student Dashboard
 * Features:
 * - View attendance summary
 * - Apply for OD
 * - View OD request status
 * - View upcoming sessions
 */
const StudentDashboard = ({ studentId, socket }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [odRequests, setODRequests] = useState([]);
  const [loading, setLoading] = useState(false);
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
    fetchDashboardData();

    // WebSocket listeners
    if (socket) {
      socket.on('od_approved', handleODApproved);
      socket.on('od_rejected', handleODRejected);
    }

    return () => {
      if (socket) {
        socket.off('od_approved', handleODApproved);
        socket.off('od_rejected', handleODRejected);
      }
    };
  }, [studentId, socket]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [summaryRes, requestsRes] = await Promise.all([
        studentODAPI.getAttendanceSummary(studentId),
        studentODAPI.getMyRequests(studentId)
      ]);

      // API returns { overall: { total, present, absent, od, percentage }, ... }
      setAttendanceSummary(summaryRes.data.overall ? { ...summaryRes.data.overall } : summaryRes.data);
      setODRequests(requestsRes.data);
      

    } catch (err) {
      setError('Failed to load dashboard data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleODApproved = (data) => {
    setSuccess('Your OD request has been approved!');
    fetchDashboardData();
  };

  const handleODRejected = (data) => {
    setError(`Your OD request was rejected: ${data.remarks}`);
    fetchDashboardData();
  };

  const handleODSubmit = async (e) => {
    e.preventDefault();
    
    if (!odForm.from_date || !odForm.to_date || !odForm.reason) {
      setError('Please fill in all fields');
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
      setActiveTab('requests');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit OD request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    try {
      setLoading(true);
      await studentODAPI.cancelRequest(requestId, studentId);
      setSuccess('Request cancelled successfully');
      fetchDashboardData();
    } catch (err) {
      setError('Failed to cancel request: ' + err.message);
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
      setError('Failed to download document: ' + err.message);
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: 'badge-warning',
      approved: 'badge-success',
      rejected: 'badge-danger',
      applied: 'badge-info',
      cancelled: 'badge-secondary'
    };
    return statusMap[status] || 'badge-secondary';
  };

  return (
    <div className="student-dashboard">
      {/* Header */}

      <div className="dashboard-header">
        <div className="header-left">
          <img 
            src="/ssn_logo.png"
            alt="SSN College Logo"
            className="ssn-logo"
          />
          <h1>Student Dashboard</h1>
        </div>
        <div className="dashboard-header-actions">
          {user?.name && <span className="user-name">{user.name}</span>}
          <button onClick={handleLogout} className="btn btn-logout">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'apply-od' ? 'active' : ''}`}
          onClick={() => setActiveTab('apply-od')}
        >
          Apply for OD
        </button>
        <button
          className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          My OD Requests
          {odRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="badge">{odRequests.filter(r => r.status === 'pending').length}</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {loading && <div className="loading">Loading...</div>}

        {/* Overview Tab */}
        {activeTab === 'overview' && attendanceSummary && (
          <div className="overview-tab">
            <h2>Attendance Summary</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{attendanceSummary.percentage}%</div>
                <div className="stat-label">Attendance</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{attendanceSummary.total}</div>
                <div className="stat-label">Total Classes</div>
              </div>
              <div className="stat-card stat-success">
                <div className="stat-value">{attendanceSummary.present}</div>
                <div className="stat-label">Present</div>
              </div>
              <div className="stat-card stat-warning">
                <div className="stat-value">{attendanceSummary.od}</div>
                <div className="stat-label">On Duty</div>
              </div>
              <div className="stat-card stat-danger">
                <div className="stat-value">{attendanceSummary.absent}</div>
                <div className="stat-label">Absent</div>
              </div>
            </div>

            {attendanceSummary.percentage < 75 && (
              <div className="alert alert-warning" style={{ marginTop: '20px' }}>
                ⚠️ Your attendance is below 75%. You need to attend more classes.
              </div>
            )}

            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <button
                className="btn btn-primary"
                onClick={() => setActiveTab('apply-od')}
              >
                Apply for OD
              </button>
            </div>
          </div>
        )}

        {/* Apply OD Tab */}
        {activeTab === 'apply-od' && (
          <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto mt-6">
            <form onSubmit={handleODSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="from_date" className="block text-sm font-medium text-gray-700 mb-2">From Date *</label>
                  <input
                    type="date"
                    id="from_date"
                    value={odForm.from_date}
                    onChange={(e) => setODForm({ ...odForm, from_date: e.target.value })}
                    required
                    min={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="to_date" className="block text-sm font-medium text-gray-700 mb-2">To Date *</label>
                  <input
                    type="date"
                    id="to_date"
                    value={odForm.to_date}
                    onChange={(e) => setODForm({ ...odForm, to_date: e.target.value })}
                    required
                    min={odForm.from_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                <textarea
                  id="reason"
                  value={odForm.reason}
                  onChange={(e) => setODForm({ ...odForm, reason: e.target.value })}
                  required
                  rows={4}
                  placeholder="Please provide a detailed reason for your OD request..."
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none resize-none"
                />
                <div className="text-right text-xs text-gray-500 mt-1">{odForm.reason.length}/1000 characters</div>
              </div>

              <div>
                <label htmlFor="supporting_document" className="block text-sm font-medium text-gray-700 mb-2">Supporting Document (Optional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label htmlFor="supporting_document" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-1">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          id="supporting_document"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => setODForm({ ...odForm, supporting_document: e.target.files?.[0] || null })}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, PNG, JPG, DOC up to 5MB</p>
                  </div>
                </div>
                {odForm.supporting_document && (
                  <p className="mt-2 text-sm text-green-600 font-medium break-all text-center">Selected: {odForm.supporting_document.name}</p>
                )}
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-blue-800 mb-2">Note:</p>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  <li>You can request OD for dates up to 7 days in the past</li>
                  <li>You can request OD for dates up to 30 days in the future</li>
                  <li>Your request will be sent to admin for approval</li>
                  <li>Once approved, faculty will mark your attendance as OD</li>
                </ul>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit OD Request'}
              </button>
            </form>
          </div>
        )}

        {/* My OD Requests Tab */}
        {activeTab === 'requests' && (
          <div className="requests-tab">
            <h2>My OD Requests</h2>
            
            {odRequests.length === 0 ? (
              <div className="empty-state">
                <p>You haven't submitted any OD requests yet.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveTab('apply-od')}
                >
                  Apply for OD
                </button>
              </div>
            ) : (
              <div className="requests-list">
                {odRequests.map(req => (
                  <div key={req.id} className="request-card">
                    <div className="request-header">
                      <span className={`badge ${getStatusBadgeClass(req.status)}`}>
                        {req.status.toUpperCase()}
                      </span>
                      <span className="request-date">
                        Requested: {new Date(req.requested_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="request-body">
                      <div className="request-detail">
                        <strong>Date:</strong>
                        <span>
                          {req.from_date && req.to_date && req.from_date !== req.to_date
                            ? `${new Date(req.from_date).toLocaleDateString()} – ${new Date(req.to_date).toLocaleDateString()}`
                            : new Date(req.date || req.from_date).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="request-detail">
                        <strong>Reason:</strong>
                        <p>{req.reason}</p>
                      </div>

                      {req.supporting_document && (
                        <div className="request-detail">
                          <strong>Supporting Document:</strong>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleDownloadDocument(req.id, req.supporting_document.split('/').pop())}
                            style={{ marginTop: '4px' }}
                          >
                            View Document
                          </button>
                        </div>
                      )}

                      {req.reviewed_at && (
                        <>
                          <div className="request-detail">
                            <strong>Reviewed:</strong>
                            <span>{new Date(req.reviewed_at).toLocaleString()}</span>
                          </div>
                          {req.admin_remarks && (
                            <div className="request-detail">
                              <strong>Admin Notes:</strong>
                              <p>{req.admin_notes}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {req.status === 'pending' && (
                      <div className="request-footer">
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleCancelRequest(req.id)}
                        >
                          Cancel Request
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="sessions-tab">
            <h2>Upcoming Classes (Next 7 Days)</h2>
            <div className="empty-state">
              <p>Upcoming sessions will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
