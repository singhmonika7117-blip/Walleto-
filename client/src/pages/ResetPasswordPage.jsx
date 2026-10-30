import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, WalletCards, Check } from 'lucide-react';
import { Input, Button } from '../components/common';
import { authService } from '../services/authService';
import { validatePassword } from '../utils/validators';
import '../styles/auth.css';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const passwordError = validatePassword(password);
    if (passwordError) return setError(passwordError);
    if (password !== confirmPassword) return setError('The passwords do not match.');
    if (!token) return setError('This reset link is incomplete. Request a new password reset link.');

    try {
      setLoading(true);
      await authService.resetPassword(token, password);
      setSuccess(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Could not reset the password. Request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-layout auth-layout--single">
        <section className="auth-panel" aria-labelledby="reset-title">
          <Link className="auth-brand" to="/auth">
            <span className="auth-brand__mark"><WalletCards size={21} /></span>
            <span>Walleto</span>
          </Link>
          <div className="auth-panel__heading" style={{ marginTop: '2rem' }}>
            <p className="auth-kicker">ACCOUNT RECOVERY</p>
            <h2 id="reset-title">Choose a new password</h2>
            <p>Use at least 6 characters. Reset links expire after 30 minutes.</p>
          </div>
          {success ? (
            <>
              <div className="auth-message auth-message--success" role="status">Your password has been reset. You can now sign in.</div>
              <Link className="auth-back-link" to="/auth">Go to sign in</Link>
            </>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
              <Input label="New password" name="newPassword" type="password" placeholder="At least 6 characters" value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} icon={Lock} required autoComplete="new-password" />
              <Input label="Confirm new password" name="confirmPassword" type="password" placeholder="Enter the password again" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError(''); }} icon={Check} required autoComplete="new-password" />
              <Button type="submit" variant="primary" loading={loading} icon={Lock} style={{ width: '100%', marginTop: '0.5rem' }}>
                Reset password
              </Button>
              <Link className="auth-back-link" to="/auth">Back to sign in</Link>
            </form>
          )}
        </section>
      </div>
    </main>
  );
};

export default ResetPasswordPage;
