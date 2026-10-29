import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import PageHeader from '../components/layout/PageHeader';
import ApprovalCard from '../components/notifications/ApprovalCard';
import { Card, Loader } from '../components/common';
import { CheckCircle, Clock, History } from 'lucide-react';

const ApprovalsPage = () => {
  const { user } = useAuth();
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'

  // Socket listener for user's approvals updates across all their groups with optimistic voting
  const {
    requests: liveRequests,
    setRequests,
    optimisticVote,
    on,
    off,
    isConnected
  } = useSocket();

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const [pendingRes, historyRes] = await Promise.all([
        notificationService.getPendingApprovals(),
        notificationService.getApprovalHistory()
      ]);
      setRequests(pendingRes.approvals || []);
      setApprovalHistory(historyRes.history || []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  // The approvals page is not inside one group's socket room, so refresh the
  // cross-group list periodically to show votes cast by other members.
  useEffect(() => {
    let cancelled = false;
    const refreshApprovals = async () => {
      try {
        const [pendingRes, historyRes] = await Promise.all([
          notificationService.getPendingApprovals(),
          notificationService.getApprovalHistory()
        ]);
        if (cancelled) return;
        setRequests(pendingRes.approvals || []);
        setApprovalHistory(historyRes.history || []);
      } catch (err) {
        console.error('Failed to refresh approval votes:', err);
      }
    };

    const intervalId = window.setInterval(refreshApprovals, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [setRequests]);

  // Sync approval history when approvals are finalized or executed
  useEffect(() => {
    const handleFinalizedSync = async () => {
      try {
        const historyRes = await notificationService.getApprovalHistory();
        setApprovalHistory(historyRes.history || []);
      } catch (err) {
        console.error('Failed to reload history:', err);
      }
    };

    on('APPROVAL_FINALIZED', handleFinalizedSync);
    on('expense_executed', handleFinalizedSync);
    on('expense_cancelled', handleFinalizedSync);

    return () => {
      off('APPROVAL_FINALIZED', handleFinalizedSync);
      off('expense_executed', handleFinalizedSync);
      off('expense_cancelled', handleFinalizedSync);
    };
  }, [on, off]);

  // Optimistic local UI update with seamless server rollback if the API fails
  const handleVote = async (approvalId, vote) => {
    const rollback = optimisticVote(approvalId, vote, user);
    try {
      await notificationService.castVote(approvalId, vote);
    } catch (err) {
      rollback();
      throw err;
    }
  };

  const handleExecute = async (approvalId) => {
    await notificationService.executeExpense(approvalId);
    await loadApprovals();
  };

  const handleCancel = async (approvalId) => {
    if (window.confirm('Cancel this expense request?')) {
      await notificationService.cancelApproval(approvalId);
      await loadApprovals();
    }
  };

  const pendingApprovals = liveRequests.filter((a) => a.status === 'VOTING');

  if (loading && pendingApprovals.length === 0 && approvalHistory.length === 0) {
    return <Loader message="Loading expense approval sessions..." />;
  }

  return (
    <div>
      <PageHeader
        title="Expense Approvals & Real-Time Voting"
        subtitle="Vote YES or NO to dynamically set your bill share before virtual wallet deduction."
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'pending' ? 'var(--primary-gradient)' : 'rgba(255, 255, 255, 0.045)',
            color: activeTab === 'pending' ? '#17140d' : 'var(--text-muted)',
            fontWeight: activeTab === 'pending' ? 700 : 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'pending' ? '0 4px 12px rgba(211, 179, 107, 0.16)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Clock size={16} />
          <span>Active Voting Sessions ({pendingApprovals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'history' ? 'var(--primary-gradient)' : 'rgba(255, 255, 255, 0.045)',
            color: activeTab === 'history' ? '#17140d' : 'var(--text-muted)',
            fontWeight: activeTab === 'history' ? 700 : 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'history' ? '0 4px 12px rgba(211, 179, 107, 0.16)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <History size={16} />
          <span>Executed & Past ({approvalHistory.length})</span>
        </button>
      </div>

      {/* Active Tab */}
      {activeTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {pendingApprovals.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '4rem 1.5rem', background: 'var(--glass-card)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <CheckCircle size={28} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>All Caught Up!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                There are no expenses currently requiring your vote across all your groups.
              </p>
            </Card>
          ) : (
            pendingApprovals.map((approval) => (
              <ApprovalCard
                key={approval._id}
                approval={approval}
                currentUserId={user?._id}
                onVote={handleVote}
                onExecute={handleExecute}
                onCancel={handleCancel}
                currency={approval.groupId?.currency || 'INR'}
              />
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {approvalHistory.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'var(--glass-card)' }}>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                No past executed expense history found.
              </p>
            </Card>
          ) : (
            approvalHistory.map((approval) => (
              <ApprovalCard
                key={approval._id}
                approval={approval}
                currentUserId={user?._id}
                currency={approval.groupId?.currency || 'INR'}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ApprovalsPage;
