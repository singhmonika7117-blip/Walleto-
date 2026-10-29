import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../hooks/useAuth';
import PageHeader from '../components/layout/PageHeader';
import BalanceCard from '../components/wallet/BalanceCard';
import AddFundsModal from '../components/wallet/AddFundsModal';
import TransactionList from '../components/wallet/TransactionList';
import { Card, Modal, Input, Button, Loader } from '../components/common';
import { ArrowDownLeft, History, Shield, Zap } from 'lucide-react';
import { validateAmount } from '../utils/validators';

const WalletPage = () => {
  const { user } = useAuth();
  const { balance, currency, transactions, loading, deposit, createDepositQr, checkDepositQr, withdraw } = useWallet();

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  const handleDeposit = async (amount, method) => {
    await deposit(amount, method);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const err = validateAmount(withdrawAmount);
    if (err) {
      setWithdrawError(err);
      return;
    }

    if (Number(withdrawAmount) > balance) {
      setWithdrawError('Withdrawal amount cannot exceed available balance');
      return;
    }

    try {
      setWithdrawLoading(true);
      setWithdrawError('');
      await withdraw(withdrawAmount, { accountNumber });
      setWithdrawAmount('');
      setAccountNumber('');
      setIsWithdrawOpen(false);
    } catch (err) {
      setWithdrawError(err.response?.data?.message || 'Withdrawal failed');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading && !balance) {
    return <Loader message="Loading your personal virtual wallet..." />;
  }

  return (
    <div>
      <PageHeader
        title="Personal Virtual Wallet"
        subtitle="Manage your wallet and add funds through Razorpay test checkout."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* Left: Balance card */}
        <div>
          <BalanceCard
            balance={balance}
            currency={currency}
            onAddFunds={() => setIsDepositOpen(true)}
            
          />
        </div>

        {/* Right: Security & Perks info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--glass-card)' }}>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
              <Zap size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-main)' }}>Razorpay Test Top-ups</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', marginTop: '0.125rem' }}>
                Use Razorpay test checkout. The wallet is credited only after the payment is confirmed.
              </p>
            </div>
          </Card>

          <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--glass-card)' }}>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(211, 179, 107, 0.12)', color: 'var(--primary)' }}>
              <Shield size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-main)' }}>Group Pool Contribution</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', marginTop: '0.125rem' }}>
                Transfer balance to group virtual pools to ensure your bills execute smoothly.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Transaction History Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <History size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Personal Wallet Logs</h2>
        </div>

        <TransactionList transactions={transactions} currency={currency} />
      </div>

      {/* Deposit Modal */}
      <AddFundsModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onDeposit={handleDeposit}
        onCreateQr={(amount) => createDepositQr(amount)}
        onCheckQr={checkDepositQr}
        title="Add Funds to Personal Wallet"
        currency={currency}
      />

      {/* Withdraw Modal */}
      <Modal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        title="Withdraw Funds to Bank"
      >
        <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {withdrawError && (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              {withdrawError}
            </div>
          )}

          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Available balance to withdraw: <strong>₹{balance.toFixed(2)}</strong>
          </p>

          <Input
            label="Amount to Withdraw (₹)"
            name="withdrawAmount"
            type="number"
            step="1"
            min="1"
            max={balance}
            placeholder="0.00"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            required
          />

          <Input
            label="Bank Account Number / UPI ID"
            name="accountNumber"
            type="text"
            placeholder="e.g. 1234567890 or alex@oksbi"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setIsWithdrawOpen(false)} disabled={withdrawLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={withdrawLoading} icon={ArrowDownLeft}>
              Confirm Simulated Withdrawal
            </Button>
          </div>
        </form>
      </Modal>

      <style>{`
        @media (max-width: 868px) {
          div[style*="grid-template-columns: 1.2fr 0.8fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WalletPage;
