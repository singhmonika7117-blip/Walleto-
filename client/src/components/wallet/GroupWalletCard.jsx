import React from 'react';
import { Card, Button } from '../common';
import { Wallet, PlusCircle, Users, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const GroupWalletCard = ({ wallet, myContribution = 0, currency = 'INR', onContribute }) => {
  const totalBalance = wallet?.totalBalance || 0;

  return (
    <Card
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 249, 255, 0.95) 100%)',
        border: '1.5px solid rgba(49, 91, 122, 0.24)',
        boxShadow: '0 10px 30px rgba(49, 91, 122, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'var(--secondary-gradient)', color: '#fff' }}>
              <Wallet size={18} />
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--secondary)', letterSpacing: '0.04em' }}>
              Shared Virtual Wallet Pool
            </span>
          </div>

          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
            {formatCurrency(totalBalance, currency)}
          </h2>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            Combined balance contributed by all group members for bill splitting
          </p>
        </div>

        {/* User's Individual Contribution Card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
          <div
            style={{
              background: 'var(--glass-input)',
              border: '1px solid var(--glass-border-subtle)',
              padding: '0.625rem 1rem',
              borderRadius: 'var(--radius-md)',
              textAlign: 'right',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
              My Contributed Balance
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: myContribution > 0 ? 'var(--success)' : 'var(--danger)' }}>
              {formatCurrency(myContribution, currency)}
            </span>
          </div>

          <Button
            size="sm"
            variant="primary"
            icon={PlusCircle}
            onClick={onContribute}
          >
            Add Funds to Group Pool
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default GroupWalletCard;
