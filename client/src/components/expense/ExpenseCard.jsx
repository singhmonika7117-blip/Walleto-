import React, { useState } from 'react';
import { Card, Badge } from '../common';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ChevronDown, ChevronUp, Trash2, CheckCircle2, Clock, XCircle } from 'lucide-react';

const ExpenseCard = ({ expense, currentUserId, onDelete, currency = 'USD' }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success" icon={CheckCircle2}>Approved</Badge>;
      case 'pending_approval':
        return <Badge variant="warning" icon={Clock}>Pending Approval</Badge>;
      case 'rejected':
        return <Badge variant="danger" icon={XCircle}>Rejected</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const isPayer = expense.paidBy?._id === currentUserId;

  return (
    <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(211, 179, 107, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: 'var(--primary)'
            }}
          >
            {expense.paidBy?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {expense.title}
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Paid by <strong style={{ color: 'var(--text-muted)' }}>{isPayer ? 'You' : expense.paidBy?.name}</strong> • {formatDate(expense.createdAt)}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {formatCurrency(expense.amount, currency)}
          </span>
          <div style={{ marginTop: '0.25rem' }}>
            {getStatusBadge(expense.status)}
          </div>
        </div>
      </div>

      {/* Split Summary / Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
        <span>Split Type: <strong style={{ color: 'var(--text-muted)' }}>{expense.splitType}</strong> ({expense.splits?.length || 0} participants)</span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isPayer && onDelete && (
            <button
              onClick={() => onDelete(expense._id)}
              title="Delete expense"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '0.25rem'
              }}
            >
              <Trash2 size={14} />
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
          >
            <span>{expanded ? 'Hide Breakdown' : 'View Breakdown'}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded Split Breakdown */}
      {expanded && (
        <div style={{ backgroundColor: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
          {expense.splits?.map((split, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: split.user?._id === currentUserId ? 'var(--primary)' : 'var(--text-main)', fontWeight: split.user?._id === currentUserId ? 700 : 500 }}>
                  {split.user?._id === currentUserId ? 'You' : split.user?.name || 'Member'}
                </span>
                <Badge
                  variant={split.status === 'approved' ? 'success' : split.status === 'rejected' ? 'danger' : 'warning'}
                  style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem' }}
                >
                  {split.status}
                </Badge>
              </div>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                {formatCurrency(split.amount, currency)}
              </span>
            </div>
          ))}
          {expense.notes && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem', fontStyle: 'italic' }}>
              Note: {expense.notes}
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

export default ExpenseCard;
