import '../styles/dashboard.css';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { groupService } from '../services/groupService';
import { expenseService } from '../services/expenseService';
import { notificationService } from '../services/notificationService';
import PageHeader from '../components/layout/PageHeader';
import GroupCard from '../components/group/GroupCard';
import CreateGroupModal from '../components/group/CreateGroupModal';
import JoinGroupModal from '../components/group/JoinGroupModal';
import InviteFriendsModal from '../components/group/InviteFriendsModal';
import BalanceCard from '../components/wallet/BalanceCard';
import AddFundsModal from '../components/wallet/AddFundsModal';
import { Card, Button, Loader } from '../components/common';
import { Users, CheckSquare, Plus, KeyRound, ArrowRight, ReceiptText, Wallet, WalletCards, History, Clock3, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../utils/formatters';

const DashboardPage = () => {
  const { user } = useAuth();
  const { balance, currency, transactions, deposit, createDepositQr, checkDepositQr } = useWallet();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const displayCurrency = user?.defaultCurrency || currency;
  const totalExpenses = expenses.reduce((sum, expense) => {
    const groupCurrency = groups.find((group) => String(group._id) === String(expense.groupId?._id || expense.groupId))?.currency;
    const expenseCurrency = expense.currency || groupCurrency || displayCurrency;
    return expense.status !== 'rejected' && expenseCurrency === displayCurrency
      ? sum + Number(expense.amount || 0)
      : sum;
  }, 0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsRes, approvalsRes] = await Promise.all([
        groupService.getUserGroups(),
        notificationService.getPendingApprovals()
      ]);
      const nextGroups = groupsRes.groups || [];
      setGroups(nextGroups);
      setPendingApprovals(approvalsRes.approvals || []);
      const expenseResponses = await Promise.all(nextGroups.map(async (group) => {
        try {
          const response = await expenseService.getGroupExpenses(group._id);
          return response.expenses || [];
        } catch (err) {
          console.warn(`Could not load expenses for group ${group._id}:`, err);
          return [];
        }
      }));
      setExpenses(expenseResponses.flat());
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGroup = async (formData) => {
    await groupService.createGroup(formData);
    await loadData();
  };

  if (loading) {
    return <Loader message="Loading your groups & virtual wallets..." />;
  }

  return (
    <div className="dashboard-root">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'Friend'} 👋`}
        subtitle="A quick look at what your groups need today."
        actions={groups.length > 0 && (
          <>
            <Button
              variant="secondary"
              icon={KeyRound}
              onClick={() => setIsJoinOpen(true)}
            >
              Join with Code
            </Button>
            <Button
              variant="secondary"
              icon={UserPlus}
              onClick={() => setIsInviteOpen(true)}
            >
              Invite friends
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setIsCreateOpen(true)}
            >
              Create Group
            </Button>
          </>
        )}
      />

      {/* Shared Wallet Hero */}
      <section className="dashboard-hero">
        <BalanceCard
          balance={balance}
          currency={user?.defaultCurrency || currency}
          onAddFunds={() => setIsAddFundsOpen(true)}
          onWithdraw={() => navigate('/wallet')}
        />
      </section>

      <section className="dashboard-overview" aria-label="At a glance">
        <p className="dashboard-overview__label">Your money, at a glance</p>
        <div className="dashboard-metrics">
          <DashboardMetric icon={ReceiptText} label="Total expenses" value={formatCurrency(totalExpenses, displayCurrency)} detail={`In ${displayCurrency} across your groups`} tone="lavender" />
          <DashboardMetric icon={Users} label="Your groups" value={groups.length} detail="Shared spaces" tone="blue" />
          <DashboardMetric icon={CheckSquare} label="Pending approvals" value={pendingApprovals.length} detail={pendingApprovals.length ? 'Ready for your review' : 'You’re all caught up'} tone="amber" />
          <DashboardMetric icon={WalletCards} label="Money added" value={formatCurrency(transactions.filter((tx) => tx.type === 'deposit' && tx.status === 'completed').reduce((sum, tx) => sum + Number(tx.amount || 0), 0), currency)} detail="From recent wallet activity" tone="mint" />
        </div>
      </section>

      <section className="dashboard-activity-grid" aria-label="Recent activity">
        <Card className="dashboard-activity-card">
          <div className="dashboard-activity-heading">
            <div><span className="dashboard-activity-kicker">THE LATEST</span><h2>Recent transactions</h2></div>
            <Link to="/wallet" className="dashboard-view-all">View wallet <ArrowRight size={15} /></Link>
          </div>
          {transactions.length ? <div className="dashboard-transaction-list">
            {transactions.slice(0, 4).map((tx) => {
              const positive = ['deposit', 'refund'].includes(tx.type);
              return <div className="dashboard-transaction-row" key={tx._id}>
                <span className={`dashboard-transaction-icon ${positive ? 'is-positive' : 'is-negative'}`}>{positive ? <Wallet size={17} /> : <ReceiptText size={17} />}</span>
                <span className="dashboard-transaction-copy"><strong>{tx.description || (tx.type || 'Wallet activity').replaceAll('_', ' ')}</strong><small>{formatDate(tx.createdAt)}</small></span>
                <strong className={`dashboard-transaction-amount ${positive ? 'is-positive' : 'is-negative'}`}>{positive ? '+' : '−'}{formatCurrency(tx.amount, currency)}</strong>
              </div>;
            })}
          </div> : <div className="dashboard-activity-empty"><History size={22} /><span>No transactions yet. Add funds to start your activity.</span></div>}
        </Card>

        <Card className="dashboard-activity-card dashboard-requests-card">
          <div className="dashboard-activity-heading">
            <div><span className="dashboard-activity-kicker">NEEDS A LOOK</span><h2>Pending requests</h2></div>
            <Link to="/approvals" className="dashboard-view-all">All approvals <ArrowRight size={15} /></Link>
          </div>
          {pendingApprovals.length ? <div className="dashboard-request-list">
            {pendingApprovals.slice(0, 3).map((approval) => <Link className="dashboard-request-row" to="/approvals" key={approval._id}>
              <span className="dashboard-request-icon"><Clock3 size={17} /></span>
              <span className="dashboard-transaction-copy"><strong>{approval.title || 'Expense request'}</strong><small>From {approval.createdBy?.name || 'a group member'}</small></span>
              <strong className="dashboard-request-amount">{formatCurrency(approval.totalAmount || 0, approval.groupId?.currency || currency)}</strong>
            </Link>)}
          </div> : <div className="dashboard-activity-empty"><CheckSquare size={22} /><span>Nothing waiting on you. Nice!</span></div>}
        </Card>
      </section>

      {/* Groups Grid */}
      <section className="dashboard-groups-section">
        <div className="dashboard-section-header">
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Your groups</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Shared wallets for trips, homes and everyday plans.</p>
          </div>
        </div>

        {groups.length === 0 ? (
          <Card className="dashboard-empty-state">
            <div className="dashboard-empty-state__icon">
              <Users size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Start with a group</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
              Make a shared space for a trip, home or team. Invite people with a code and keep shared costs together.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
              <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
                Create your first group
              </Button>
              <Button variant="secondary" icon={KeyRound} onClick={() => setIsJoinOpen(true)}>Join with an invite code</Button>
            </div>
          </Card>
        ) : (
          <div className="dashboard-groups-grid">
            {groups.map((group, index) => (
              <div className="dashboard-group-item" key={group._id} style={{ '--item-delay': `${Math.min(index, 6) * 55}ms` }}>
                <GroupCard group={group} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateGroup}
      />

      <JoinGroupModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onJoinSuccess={loadData}
      />

      <InviteFriendsModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        groups={groups}
      />

      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
        onDeposit={deposit}
        onCreateQr={(amount) => createDepositQr(amount)}
        onCheckQr={checkDepositQr}
        currency={user?.defaultCurrency || currency}
      />
    </div>
  );
};

const DashboardMetric = ({ icon: Icon, label, value, detail, tone }) => (
  <Card className={`dashboard-metric-card dashboard-metric-card--${tone}`}>
    <span className="dashboard-metric-card__icon"><Icon size={19} /></span>
    <span className="dashboard-metric-card__copy"><span className="dashboard-metric-card__label">{label}</span><strong>{value}</strong><small>{detail}</small></span>
  </Card>
);

export default DashboardPage;
