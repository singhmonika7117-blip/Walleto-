import React from 'react';
import { Badge } from '../common';
import { formatCurrency } from '../../utils/formatters';
import { Wallet, Shield } from 'lucide-react';

const MemberList = ({ members = [], currency = 'INR' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {members.map((member) => {
        const isCreator = member.role === 'CREATOR';
        const contrib = member.contributedBalance || 0;

        return (
          <div
            key={member._id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.875rem 1.25rem',
              background: 'var(--glass-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border-subtle)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: isCreator ? 'var(--primary-gradient)' : 'rgba(211, 179, 107, 0.1)',
                  color: isCreator ? '#ffffff' : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9375rem',
                  boxShadow: isCreator ? '0 2px 8px rgba(211, 179, 107, 0.24)' : 'none'
                }}
              >
                {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                    {member.name}
                  </span>
                  <Badge variant={isCreator ? 'primary' : 'neutral'} style={{ fontSize: '0.625rem', padding: '0.15rem 0.45rem' }}>
                    {isCreator && <Shield size={10} style={{ marginRight: '2px' }} />}
                    {member.role}
                  </Badge>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {member.email}
                </span>
              </div>
            </div>

            {/* Individual Virtual Wallet Contribution */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'flex-end' }}>
                <Wallet size={14} color="var(--primary)" />
                <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: contrib > 0 ? 'var(--success)' : 'var(--text-dim)' }}>
                  {formatCurrency(contrib, currency)}
                </span>
              </div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                contributed balance
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MemberList;
