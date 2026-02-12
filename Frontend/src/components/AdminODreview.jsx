import React, { useState, useEffect } from 'react';
import { adminODAPI } from '../services/api';

const AdminODReview = ({ adminId, socket }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchPendingRequests();
    
    if (socket) {
      socket.on('new_od_request', () => {
        fetchPendingRequests();
      });
    }
  }, [socket]);
  
  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await adminODAPI.getPending();
      setPendingRequests(response.data);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReview = async (requestId, action, remarks) => {
    try {
      await adminODAPI.review(requestId, {
        admin_id: adminId,
        action,
        remarks
      });
      fetchPendingRequests();
    } catch (err) {
      console.error('Failed to review:', err);
    }
  };
  
  return (
    <div className="admin-od-review">
      <h2>Pending OD Requests</h2>
      {pendingRequests.map(req => (
        <div key={req.id} className="request-card">
          <h3>{req.student_name} ({req.student_roll})</h3>
          <p><strong>Period:</strong> {req.from_date} to {req.to_date}</p>
          <p><strong>Reason:</strong> {req.reason}</p>
          <div className="actions">
            <button onClick={() => {
              const remarks = prompt('Enter remarks (optional):');
              handleReview(req.id, 'approve', remarks || '');
            }}>
              Approve
            </button>
            <button onClick={() => {
              const remarks = prompt('Enter reason for rejection:');
              if (remarks) handleReview(req.id, 'reject', remarks);
            }}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminODReview;