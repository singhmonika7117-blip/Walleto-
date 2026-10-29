import React, { useEffect, useState } from 'react';
import { Modal, Input, Button } from '../common';
import { CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';
import { validateAmount } from '../../utils/validators';

const AddFundsModal = ({ isOpen, onClose, onDeposit, onCreateQr, onCheckQr, title = 'Top-up Virtual Wallet', currency = 'INR' }) => {
  const [amount, setAmount] = useState('500');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [qr, setQr] = useState(null);
  const [qrChecking, setQrChecking] = useState(false);
  const presetAmounts = ['200', '500', '1000', '2000', '5000'];

  useEffect(() => {
    if (!isOpen) {
      setQr(null);
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !qr?.id || success || !onCheckQr) return undefined;
    let active = true;
    let checking = false;
    const poll = async () => {
      if (checking) return;
      checking = true;
      setQrChecking(true);
      try {
        if (await onCheckQr(qr.id) && active) setSuccess(true);
      } catch (err) {
        if (active) setError(err.response?.data?.message || err.message || 'Could not check QR payment yet.');
      } finally {
        checking = false;
        if (active) setQrChecking(false);
      }
    };
    const timer = window.setInterval(poll, 3000);
    poll();
    return () => { active = false; window.clearInterval(timer); };
  }, [isOpen, qr, success, onCheckQr]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => { setSuccess(false); setQr(null); onClose(); }, 1400);
    return () => window.clearTimeout(timer);
  }, [success, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateAmount(amount);
    if (validationError) { setError(validationError); return; }
    try {
      setLoading(true); setError('');
      await onDeposit(amount);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Test payment could not be started.');
    } finally { setLoading(false); }
  };

  const handleCreateQr = async () => {
    const validationError = validateAmount(amount);
    if (validationError) { setError(validationError); return; }
    try {
      setLoading(true); setError(''); setQr(null);
      const createdQr = await onCreateQr(amount);
      setQr(createdQr);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'QR payment could not be started.');
    } finally { setLoading(false); }
  };

  return <Modal isOpen={isOpen} onClose={onClose} title={title}>
    {success ? <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
      <CheckCircle2 size={54} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 800 }}>Test payment confirmed</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>₹{amount} was added after Razorpay confirmed the test payment.</p>
    </div> : <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {error && <div role="alert" style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>{error}</div>}
      <div>
        <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Quick Select Amount ({currency})</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{presetAmounts.map((preset) => <button key={preset} type="button" disabled={Boolean(qr) || loading} onClick={() => setAmount(preset)} style={{ flex: '1 0 16%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1.5px solid', borderColor: amount === preset ? 'var(--primary)' : 'var(--glass-border-subtle)', backgroundColor: amount === preset ? 'rgba(211, 179, 107, 0.12)' : 'var(--glass-input)', color: amount === preset ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 800, cursor: qr || loading ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>₹{preset}</button>)}</div>
      </div>
      <Input label={`Amount (${currency})`} name="amount" type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={Boolean(qr) || loading} required />
      <div style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', background: 'rgba(99,102,241,.08)', color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', gap: '.6rem' }}><ShieldCheck size={18} /> Razorpay test mode only. No real money will be charged.</div>
      {qr && <div style={{ textAlign: 'center', padding: '1rem', border: '1px solid var(--glass-border-subtle)', borderRadius: 'var(--radius-md)' }}>
        <img src={qr.imageUrl} alt={`Razorpay UPI QR code for ₹${amount}`} style={{ width: 220, height: 220, objectFit: 'contain', margin: '0 auto', display: 'block' }} />
        <strong style={{ display: 'block', marginTop: '.5rem' }}>Scan to pay ₹{amount}</strong>
        <span style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>{qrChecking ? 'Waiting for payment confirmation…' : 'Open any UPI app and scan this code.'}</span>
      </div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
        {!qr && <>
          <Button type="button" variant="secondary" icon={QrCode} onClick={handleCreateQr} loading={loading} disabled={loading}>Pay by QR</Button>
          <Button type="submit" variant="primary" loading={loading} disabled={loading}>Continue to secure checkout</Button>
        </>}
      </div>
    </form>}
  </Modal>;
};
export default AddFundsModal;
