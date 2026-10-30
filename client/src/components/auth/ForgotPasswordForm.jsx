import React, { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { Input, Button } from '../common';
import { authService } from '../../services/authService';
import { validateEmail } from '../../utils/validators';

const ForgotPasswordForm = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    try {
      setLoading(true);
      const result = await authService.requestPasswordReset(email.trim());
      setSuccess(result.message || 'If an account exists for that email, a password reset link has been sent.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Could not request a password reset. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
      {success && <div className="auth-message auth-message--success" role="status">{success}</div>}
      <Input
        label="Email"
        name="resetEmail"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => { setEmail(event.target.value); setError(''); setSuccess(''); }}
        icon={Mail}
        required
        autoComplete="email"
      />
      <Button type="submit" variant="primary" loading={loading} icon={Send} style={{ width: '100%', marginTop: '0.5rem' }}>
        Send reset link
      </Button>
      <button type="button" className="auth-back-link" onClick={onBack}>Back to sign in</button>
    </form>
  );
};

export default ForgotPasswordForm;
