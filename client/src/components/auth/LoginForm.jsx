import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Input, Button } from '../common';
import { Mail, Lock, LogIn } from 'lucide-react';
import { validateEmail, validatePassword } from '../../utils/validators';

const LoginForm = ({ onToggleMode }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    const emailErr = validateEmail(formData.email);
    if (emailErr) newErrors.email = emailErr;

    const passErr = validatePassword(formData.password);
    if (passErr) newErrors.password = passErr;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      await login(formData.email, formData.password);
    } catch (err) {
      setServerError(
        err.response?.data?.message ||
        (err.code === 'ERR_API_UNAVAILABLE'
          ? err.message
          : err.code === 'ERR_NETWORK' || err.message === 'Network Error'
            ? 'Walleto’s server could not be reached. Check your connection or try again later.'
            : err.response
              ? 'Login failed. Please try again.'
              : err.message || 'Login failed. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {serverError && (
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          {serverError}
        </div>
      )}

      <Input
        label="Email"
        name="email"
        type="email"
        placeholder="alex@example.com"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        icon={Mail}
        required
      />

      <Input
        label="Password"
        name="password"
        type="password"
        placeholder="••••••••"
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        icon={Lock}
        required
      />

      <button
        type="button"
        onClick={onForgotPassword}
        style={{ alignSelf: 'flex-end', marginTop: '-0.25rem', background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}
      >
        Forgot password?
      </button>

      <Button
        type="submit"
        variant="primary"
        loading={loading}
        icon={LogIn}
        style={{ width: '100%', marginTop: '1rem' }}
      >
        Sign In
      </Button>

      <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onToggleMode}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
        >
          Create one now
        </button>
      </div>
    </form>
  );
};

export default LoginForm;
