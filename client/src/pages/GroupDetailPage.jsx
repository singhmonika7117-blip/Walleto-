import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupService } from '../services/groupService';
import { useWallet } from '../hooks/useWallet';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import PageHeader from '../components/layout/PageHeader';
import GroupWalletCard from '../components/wallet/GroupWalletCard';
import AddFundsModal from '../components/wallet/AddFundsModal';
import MemberList from '../components/group/MemberList';
import ExpenseForm from '../components/expense/ExpenseForm';
import ApprovalCard from '../components/notifications/ApprovalCard';
import { Card, Button, Modal, Loader, Badge } from '../components/common';
import { Plus, Users, Receipt, Copy, Check, ArrowLeft, History, Vote, Sparkles } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

const GroupDetailPage = () => {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { deposit, createDepositQr, checkDepositQr } = useWallet();

  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState('voting'); // 'voting' | 'history' | 'members' | 'transactions'

  // Socket for realtime room updates
  const { on, off } = useSocket(groupId);

  const fetchGroup = useCallback(async () => {
    try {
      const data = await groupService.getGroupDetails(groupId);
      setGroupData(data);
    } catch (err) {
      console.error('Failed to load group:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  // Real-time Socket.io listeners
  useEffect(() => {
    const handleUpdate = () => fetchGroup();

    on('APPROVAL_REQUEST_CREATED', handleUpdate);
    on('VOTE_UPDATED', handleUpdate);
    on('APPROVAL_FINALIZED', handleUpdate);
    on('expense_request_created', handleUpdate);
    on('vote_updated', handleUpdate);
    on('expense_executed', handleUpdate);
    on('expense_cancelled', handleUpdate);
    on('wallet_updated', handleUpdate);
    on('wallet_insufficient', (data) => {
      alert(`⚠️ ${data.message || 'Insufficient wallet balance to execute expense'}`);
      fetchGroup();
    });
    on('member_joined', handleUpdate);

    return () => {
      off('APPROVAL_REQUEST_CREATED', handleUpdate);
      off('VOTE_UPDATED', handleUpdate);
      off('APPROVAL_FINALIZED', handleUpdate);
      off('expense_request_created', handleUpdate);
      off('vote_updated', handleUpdate);
      off('expense_executed', handleUpdate);
      off('expense_cancelled', handleUpdate);
      off('wallet_updated', handleUpdate);
      off('wallet_insufficient', handleUpdate);
      off('member_joined', handleUpdate);
    };
  }, [on, off, fetchGroup]);

  const handleCopyCode = () => {
    if (groupData?.group?.inviteCode) {
      navigator.clipboard.writeText(groupData.group.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleContribute = async (amount) => {
    await deposit(amount, groupId);
    await fetchGroup();
  };

  const handleCastVote = async (approvalId, vote) => {
    await notificationService.castVote(approvalId, vote);
    await fetchGroup();
  };

  const handleExecuteExpense = async (approvalId) => {
    await notificationService.executeExpense(approvalId);
    await fetchGroup();
  };

  const handleCancelApproval = async (approvalId) => {
    if (window.confirm('Cancel this expense approval request?')) {
      await notificationService.cancelApproval(approvalId);
      await fetchGroup();
    }
  };

  if (loading) return <Loader message="Loading group shared wallet & voting session..." />;
  if (!groupData) return <div style={{ textAlign: 'center', padding: '3rem' }}>Group not found</div>;

  const { group, wallet, members, expenseApprovals, transactions } = groupData;
  const votingApprovals = expenseApprovals.filter((a) => a.status === 'VOTING');
  const pastApprovals = expenseApprovals.filter((a) => a.status !== 'VOTING');

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          background: 'none',
          border: 'none',
          color: 'var(--text-dim)',
          cursor: 'pointer',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          fontWeight: 600
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </button>

      <PageHeader
        title={group.name}
        subtitle={group.description || 'Shared virtual wallet pool & selective expense splitting.'}
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* Shareable Code Copy Button */}
            <button
              onClick={handleCopyCode}
              title="Click to copy shareable code"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: 'var(--glass-input)',
                border: '1.5px solid var(--glass-border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.55rem 0.95rem',
                color: copiedCode ? 'var(--success)' : 'var(--text-main)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              {copiedCode ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
              <span>Code: {group.inviteCode}</span>
            </button>

            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setIsExpenseOpen(true)}
            >
              Add Expense for Voting
            </Button>
          </div>
        }
      />

      {/* Shared Virtual Wallet Pool Card */}
      <div style={{ marginBottom: '2rem' }}>
        <GroupWalletCard
          wallet={wallet}
          myContribution={wallet?.myContribution || 0}
          currency={group.currency}
          onContribute={() => setIsContributeOpen(true)}
        />
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border-subtle)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'voting', label: `Active Votes (${votingApprovals.length})`, icon: Vote },
          { id: 'history', label: `Executed Expenses (${pastApprovals.length})`, icon: Receipt },
          { id: 'members', label: `Members (${members.length})`, icon: Users },
          { id: 'transactions', label: `Wallet Logs (${transactions.length})`, icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: isActive ? 'var(--primary-gradient)' : 'rgba(255, 255, 255, 0.6)',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: isActive ? '0 4px 12px rgba(211, 179, 107, 0.2)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Active Approvals & Voting */}
      {activeTab === 'voting' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {votingApprovals.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'var(--glass-card)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(211, 179, 107, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <Vote size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>No Active Expense Votes</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
                All expenses are settled. Click below to add an expense request and start selective member voting!
              </p>
              <Button variant="primary" icon={Plus} onClick={() => setIsExpenseOpen(true)}>
                Add Expense for Voting
              </Button>
            </Card>
          ) : (
            votingApprovals.map((approval) => (
              <ApprovalCard
                key={approval._id}
                approval={approval}
                currentUserId={user?._id}
                onVote={handleCastVote}
                onExecute={handleExecuteExpense}
                onCancel={handleCancelApproval}
                currency={group.currency}
              />
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT: Executed Expenses */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pastApprovals.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--glass-card)' }}>
              <Receipt size={40} color="var(--text-dim)" style={{ margin: '0 auto 0.75rem auto' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No past executed expenses in this group yet.
              </p>
            </Card>
          ) : (
            pastApprovals.map((approval) => (
              <ApprovalCard
                key={approval._id}
                approval={approval}
                currentUserId={user?._id}
                onVote={handleCastVote}
                onExecute={handleExecuteExpense}
                onCancel={handleCancelApproval}
                currency={group.currency}
              />
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT: Members */}
      {activeTab === 'members' && (
        <MemberList members={members} currency={group.currency} />
      )}

      {/* TAB CONTENT: Wallet Transactions */}
      {activeTab === 'transactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {transactions.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--glass-card)' }}>
              <History size={40} color="var(--text-dim)" style={{ margin: '0 auto 0.75rem auto' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No virtual wallet activity logged yet.
              </p>
            </Card>
          ) : (
            transactions.map((tx) => (
              <Card key={tx._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', background: 'var(--glass-card)' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {tx.description}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    By {tx.userId?.name || 'Member'} • {formatDate(tx.createdAt)}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: tx.type === 'deposit' ? 'var(--success)' : 'var(--danger)'
                  }}
                >
                  {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount, group.currency)}
                </span>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        title="Create Expense for Selective Splitting"
        maxWidth="580px"
      >
        <ExpenseForm
          groupId={groupId}
          currency={group.currency}
          onExpenseCreated={fetchGroup}
          onClose={() => setIsExpenseOpen(false)}
        />
      </Modal>

      {/* Add Funds to Group Virtual Wallet Modal */}
      <AddFundsModal
        isOpen={isContributeOpen}
        onClose={() => setIsContributeOpen(false)}
        onDeposit={handleContribute}
        onCreateQr={(amount) => createDepositQr(amount, groupId)}
        onCheckQr={checkDepositQr}
        title={`Contribute Funds to ${group.name} Pool`}
        currency={group.currency}
      />
    </div>
  );
};

export default GroupDetailPage;
