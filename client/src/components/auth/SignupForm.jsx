import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Input, Button } from '../common';
import { User, Mail, Lock, Phone, UserPlus } from 'lucide-react';
import { validateEmail, validatePassword } from '../../utils/validators';

const SignupForm = ({ onToggleMode }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    defaultCurrency: 'INR'
  });
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

    if (!formData.name.trim()) newErrors.name = 'Full name is required';
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
      await register(formData);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {serverError && (
        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
          {serverError}
        </div>
      )}

      <Input
        label="Full Name"
        name="name"
        type="text"
        placeholder="Alex Mercer"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        icon={User}
        required
      />

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
        placeholder="At least 6 characters"
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        icon={Lock}
        required
      />

      <div className="grid-2">
        <Input
          label="Phone (optional)"
          name="phone"
          type="tel"
          placeholder="+91 98765 43210"
          value={formData.phone}
          onChange={handleChange}
          icon={Phone}
        />

        <div className="input-group">
          <label className="input-label" htmlFor="defaultCurrency">Currency</label>
          <select
            id="defaultCurrency"
            name="defaultCurrency"
            value={formData.defaultCurrency}
            onChange={handleChange}
            className="input-field"
          >
            <option value="INR">INR (₹ - Rupee)</option>
            <option value="USD">USD ($ - Dollar)</option>
            <option value="EUR">EUR (€ - Euro)</option>
            <option value="GBP">GBP (£ - Pound)</option>
          </select>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={loading}
        icon={UserPlus}
        style={{ width: '100%', marginTop: '0.75rem' }}
      >
        {import.meta.env.DEV ? 'Create account & get ₹2,000 demo balance' : 'Create account'}
      </Button>

      <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={onToggleMode}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
        >
          Sign In
        </button>
      </div>
    </form>
  );
};

export default SignupForm;
