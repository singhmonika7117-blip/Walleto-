import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge } from '../common';
import { Users, Wallet, Copy, Check, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const GroupCard = ({ group }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categoryIcons = {
    trip: '✈️',
    apartment: '🏠',
    couple: '❤️',
    friends: '🎉',
    project: '💼',
    other: '📁'
  };

  const isCreator = group.role === 'CREATOR';

  return (
    <Card hover style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(211, 179, 107, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              boxShadow: '0 2px 8px rgba(211, 179, 107, 0.08)'
            }}
          >
            {categoryIcons[group.category] || '📁'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800 }}>
              {group.name}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>
              {group.category || 'Group'}
            </span>
          </div>
        </div>

        <Badge variant={isCreator ? 'primary' : 'neutral'}>
          {group.role}
        </Badge>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem', flex: 1, lineHeight: 1.5 }}>
        {group.description || 'Virtual wallet pool & selective expense splitting.'}
      </p>

      {/* Shared Wallet Balance & Contributions */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.035)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
            Shared Wallet Pool
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
            {formatCurrency(group.totalWalletBalance || 0, group.currency)}
          </span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
            My Balance
          </span>
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--success)' }}>
            {formatCurrency(group.myContribution || 0, group.currency)}
          </span>
        </div>
      </div>

      {/* Meta Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border-subtle)', fontSize: '0.8125rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)' }}>
          <Users size={15} />
          <span>{group.memberCount} members</span>
        </div>

        <button
          onClick={handleCopyCode}
          title="Click to copy code"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            background: '#171819',
            border: '1px solid var(--glass-border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.25rem 0.5rem',
            color: copied ? 'var(--success)' : 'var(--text-muted)',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{group.inviteCode}</span>
        </button>
      </div>

      <Link
        to={`/groups/${group._id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '0.875rem',
          padding: '0.625rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(211, 179, 107, 0.08)',
          color: 'var(--primary)',
          fontSize: '0.875rem',
          fontWeight: 700,
          transition: 'all 0.2s'
        }}
      >
        <span>View group</span>
        <ArrowRight size={14} />
      </Link>
    </Card>
  );
};

export default GroupCard;
