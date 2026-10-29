import React from 'react';
import { Plus, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const BalanceCard = ({ balance = 0, currency = 'INR', onAddFunds, onWithdraw }) => <section className="balance-card" aria-label="Wallet balance">
  <div className="balance-card__decor" aria-hidden="true">
    <span className="balance-card__coin balance-card__coin--one">₹</span>
    <span className="balance-card__coin balance-card__coin--two">✦</span>
    <span className="balance-card__coin balance-card__coin--three">+</span>
  </div>
  <div className="balance-card__topline">
    <span className="balance-card__eyebrow">Personal wallet</span>
    <span className="balance-card__mode"><ShieldCheck size={14} /> Test mode</span>
  </div>
  <p className="balance-card__label">Available balance</p>
  <p className="balance-card__amount">{formatCurrency(balance, currency)}</p>
  <div className="balance-card__actions">
    <button className="balance-card__primary" onClick={onAddFunds}><Plus size={17} /> Add funds</button>
    {onWithdraw && <button className="balance-card__secondary" onClick={onWithdraw}>Manage wallet <ArrowUpRight size={16} /></button>}
  </div>
</section>;

export default BalanceCard;
