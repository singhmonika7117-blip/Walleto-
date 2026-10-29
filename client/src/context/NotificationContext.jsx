import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { notificationService } from '../services/notificationService';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchApprovals = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [pendingRes, historyRes] = await Promise.all([
        notificationService.getPendingApprovals(),
        notificationService.getApprovalHistory()
      ]);
      setPendingApprovals(pendingRes.approvals || []);
      setApprovalHistory(historyRes.history || []);
    } catch (err) {
      console.error('Error fetching approvals:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const approve = async (approvalId) => {
    const res = await notificationService.approveExpense(approvalId);
    await fetchApprovals();
    return res;
  };

  const reject = async (approvalId, reason) => {
    const res = await notificationService.rejectExpense(approvalId, reason);
    await fetchApprovals();
    return res;
  };

  return (
    <NotificationContext.Provider
      value={{
        pendingApprovals,
        approvalHistory,
        loading,
        unreadCount: pendingApprovals.length,
        fetchApprovals,
        approve,
        reject
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
