import React from 'react';
import { Card, Badge, Button } from '../common';
import { Bell, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/formatters';

const NotificationCenter = ({ approvals = [], history = [] }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Pending Approvals Summary */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Pending Approvals ({approvals.length})</h3>
          </div>
          <Link to="/approvals" style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>View All</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {approvals.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            You're all caught up! No expenses pending your approval.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {approvals.slice(0, 3).map((item) => (
              <div
                key={item._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {item.expenseId?.title}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    From {item.expenseId?.paidBy?.name} • {item.expenseId?.groupId?.name}
                  </p>
                </div>
                <Link to="/approvals">
                  <Button size="sm" variant="primary">Review</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>
            Recent Approval Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {history.slice(0, 5).map((item) => (
              <div
                key={item._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {item.status === 'approved' ? (
                    <CheckCircle size={18} color="var(--success)" />
                  ) : (
                    <XCircle size={18} color="var(--danger)" />
                  )}
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {item.expenseId?.title || 'Expense'}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {item.status === 'approved' ? 'Approved' : 'Rejected'} • {formatDate(item.respondedAt || item.updatedAt)}
                    </span>
                  </div>
                </div>

                <Badge variant={item.status === 'approved' ? 'success' : 'danger'}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default NotificationCenter;
