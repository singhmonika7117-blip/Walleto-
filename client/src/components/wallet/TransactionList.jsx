import React from 'react';
import { Badge } from '../common';
import { ArrowDownLeft, ArrowUpRight, Plus, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

const TransactionList = ({ transactions = [], currency = 'USD' }) => {
  if (transactions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
        <p>No transactions found in this wallet yet.</p>
      </div>
    );
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'deposit':
        return <Plus size={16} color="var(--success)" />;
      case 'withdrawal':
        return <ArrowDownLeft size={16} color="var(--danger)" />;
      case 'settlement_transfer':
        return <ArrowUpRight size={16} color="var(--warning)" />;
      case 'expense_credit':
        return <ArrowDownLeft size={16} color="var(--success)" />;
      case 'expense_debit':
        return <ArrowUpRight size={16} color="var(--danger)" />;
      default:
        return <RefreshCw size={16} color="var(--primary)" />;
    }
  };

  const isPositive = (type) => ['deposit', 'expense_credit'].includes(type);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {transactions.map((tx) => {
        const positive = isPositive(tx.type);
        return (
          <div
            key={tx._id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.875rem 1.25rem',
              backgroundColor: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border)'
                }}
              >
                {getTypeIcon(tx.type)}
              </div>

              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {tx.description || tx.type.replace('_', ' ').toUpperCase()}
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {formatDate(tx.createdAt)}
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  color: positive ? 'var(--success)' : 'var(--danger)'
                }}
              >
                {positive ? '+' : '-'}{formatCurrency(tx.amount, currency)}
              </span>
              <div>
                <Badge
                  variant={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}
                  style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem' }}
                >
                  {tx.status}
                </Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TransactionList;
