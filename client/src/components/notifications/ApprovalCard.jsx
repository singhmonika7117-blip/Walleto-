import React, { useState } from 'react';
import { Card, Button, Badge } from '../common';
import { Check, X, Play, AlertCircle, CheckCircle2, XCircle, Users, Clock, Sparkles } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

const ApprovalCard = ({ approval, currentUserId, onVote, onExecute, onCancel, currency = 'INR' }) => {
  const [voteLoading, setVoteLoading] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!approval) return null;

  const isCreator = (approval.createdBy?._id || approval.createdBy) === currentUserId;
  const isVoting = approval.status === 'VOTING';
  const isExecuted = approval.status === 'EXECUTED';

  // Find current user's vote
  const myVoteObj = approval.votes?.find(
    (v) => (v.userId?._id || v.userId)?.toString() === currentUserId?.toString()
  );
  const myVote = myVoteObj?.vote; // 'APPROVE' | 'REJECT' | undefined

  const approvedUsers = approval.approvedParticipants || [];
  const rejectedUsers = approval.rejectedParticipants || [];
  const approvedCount = approvedUsers.length;

  // Dynamic Selective Split Formula: Total Amount / Number of Approved Participants
  const calculatedShare = approvedCount > 0
    ? Math.round((approval.totalAmount / approvedCount) * 100) / 100
    : 0;

  const handleVote = async (choice) => {
    // Rapid double-click protection
    if (voteLoading || executeLoading) return;
    try {
      setVoteLoading(true);
      setErrorMsg('');
      await onVote(approval._id, choice);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit vote');
    } finally {
      setVoteLoading(false);
    }
  };

  const handleExecute = async () => {
    // Rapid double-click protection
    if (executeLoading || voteLoading) return;
    try {
      setExecuteLoading(true);
      setErrorMsg('');
      await onExecute(approval._id);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Execution failed. Check wallet balance.');
    } finally {
      setExecuteLoading(false);
    }
  };

  return (
    <Card
      style={{
        background: 'var(--glass-card)',
        border: isVoting ? '1.5px solid rgba(211, 179, 107, 0.28)' : '1px solid var(--glass-border-subtle)',
        boxShadow: isVoting ? 'var(--shadow-glass-hover)' : 'var(--shadow-glass)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative'
      }}
    >
      {/* Top Header: Title, Amount, Status Badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {approval.title}
            </h3>
            <Badge
              variant={isExecuted ? 'success' : isVoting ? 'warning' : 'danger'}
              style={{ fontSize: '0.6875rem' }}
            >
              {isExecuted ? 'Executed & Settled' : isVoting ? 'Voting Active' : approval.status}
            </Badge>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Requested by <strong style={{ color: 'var(--text-main)' }}>{approval.createdBy?.name || 'Member'}</strong> • {formatDate(approval.createdAt)}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Expense
          </span>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {formatCurrency(approval.totalAmount, currency)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600 }}>
        <Users size={15} />
        <span>{approval.votes?.length || 0} votes recorded</span>
        <span>·</span>
        <span>{approvedCount} YES</span>
        <span>·</span>
        <span>{rejectedUsers.length} NO</span>
      </div>

      {/* Selective Split Dynamic Formula Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(211, 179, 107, 0.06) 0%, rgba(86, 184, 155, 0.06) 100%)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          border: '1px solid rgba(211, 179, 107, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
            <Sparkles size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.04em' }}>
              Selective Bill Split Formula
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <strong>{formatCurrency(approval.totalAmount, currency)}</strong> ÷ <strong>{approvedCount} approved participant{approvedCount === 1 ? '' : 's'}</strong>
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            *Members who reject or do not vote are charged <strong>₹0</strong> (excluded from bill)
          </span>
        </div>

        <div style={{ textAlign: 'right', background: 'var(--glass-input)', padding: '0.625rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border-subtle)', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
            Per Approved Member
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
            {formatCurrency(calculatedShare, currency)}
          </span>
        </div>
      </div>

      {/* Participants Voting Pill Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
        {/* Approved Members List */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-dim)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <CheckCircle2 size={14} color="var(--success)" /> Approved ({approvedCount}):
          </span>
          {approvedCount === 0 ? (
            <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>None yet</span>
          ) : (
            approvedUsers.map((u, i) => (
              <span
                key={i}
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--success)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.15rem 0.55rem',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {u._id === currentUserId ? 'You' : u.name || 'Member'} (Pays {formatCurrency(calculatedShare, currency)})
              </span>
            ))
          )}
        </div>

        {/* Rejected Members List */}
        {rejectedUsers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-dim)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <XCircle size={14} color="var(--danger)" /> Rejected ({rejectedUsers.length}):
            </span>
            {rejectedUsers.map((u, i) => (
              <span
                key={i}
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.15rem 0.55rem',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                {u._id === currentUserId ? 'You' : u.name || 'Member'} (Charged ₹0)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Error or Insufficient Funds Alert */}
      {(errorMsg || approval.failureReason) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
          <AlertCircle size={18} />
          <span>{errorMsg || approval.failureReason}</span>
        </div>
      )}

      {/* Execution Summary if Executed */}
      {isExecuted && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.8125rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700, marginBottom: '0.25rem' }}>
            <CheckCircle2 size={16} />
            <span>Successfully Executed & Deducted from Virtual Wallet</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Total <strong>{formatCurrency(approval.totalAmount, currency)}</strong> deducted from Shared Wallet pool. Each of the {approval.executionDetails?.participantsCharged?.length || approvedCount} approved members was charged <strong>{formatCurrency(approval.individualShare, currency)}</strong>.
          </p>
        </div>
      )}

      {/* Interactive Action Buttons (Voting & Execution) */}
      {isVoting && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border-subtle)', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ flexBasis: '100%' }}>
            <p style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.2rem' }}>Choose your vote</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>YES approves this expense and includes you in the split. NO rejects it and excludes you from the charge.</p>
            <p role='status' aria-live='polite' style={{ color: myVote ? 'var(--primary)' : 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {myVote ? 'Your current vote: ' + (myVote === 'APPROVE' ? 'YES' : 'NO') : 'You have not voted yet'}
            </p>
          </div>

          {/* Real-time Voting Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              aria-label={myVote === 'APPROVE' ? 'Your vote is YES, approve' : 'Vote YES to approve'}
              aria-pressed={myVote === 'APPROVE'}
              onClick={() => handleVote('APPROVE')}
              disabled={voteLoading || executeLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '1.5px solid',
                borderColor: myVote === 'APPROVE' ? 'var(--success)' : 'rgba(16, 185, 129, 0.3)',
                background: myVote === 'APPROVE' ? 'var(--success-gradient)' : 'rgba(16, 185, 129, 0.08)',
                color: myVote === 'APPROVE' ? '#ffffff' : 'var(--success)',
                boxShadow: myVote === 'APPROVE' ? '0 2px 10px rgba(16, 185, 129, 0.35)' : 'none'
              }}
            >
              <Check size={14} />
              <span>{myVote === 'APPROVE' ? '✓ Your vote: YES' : 'YES — Approve'}</span>
            </button>

            <button
              type="button"
              aria-label={myVote === 'REJECT' ? 'Your vote is NO, reject' : 'Vote NO to reject'}
              aria-pressed={myVote === 'REJECT'}
              onClick={() => handleVote('REJECT')}
              disabled={voteLoading || executeLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '1.5px solid',
                borderColor: myVote === 'REJECT' ? 'var(--danger)' : 'rgba(239, 68, 68, 0.3)',
                background: myVote === 'REJECT' ? 'var(--danger-gradient)' : 'rgba(239, 68, 68, 0.08)',
                color: myVote === 'REJECT' ? '#ffffff' : 'var(--danger)',
                boxShadow: myVote === 'REJECT' ? '0 2px 10px rgba(239, 68, 68, 0.35)' : 'none'
              }}
            >
              <X size={14} />
              <span>{myVote === 'REJECT' ? '✓ Your vote: NO' : 'NO — Reject'}</span>
            </button>
          </div>

          {/* Execution Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isCreator && onCancel && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onCancel(approval._id)}
                disabled={executeLoading || voteLoading}
              >
                Cancel
              </Button>
            )}

            <Button
              size="sm"
              variant="primary"
              loading={executeLoading}
              disabled={approvedCount === 0 || voteLoading}
              onClick={handleExecute}
              icon={Play}
            >
              Execute & Deduct Wallet
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ApprovalCard;
