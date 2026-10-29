import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import PageHeader from '../components/layout/PageHeader';
import { Card, Input, Button } from '../components/common';
import { User, Mail, Phone, Save, CheckCircle, Shield } from 'lucide-react';

const SettingsPage = () => {
  const { user, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    defaultCurrency: user?.defaultCurrency || 'USD'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSuccess(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setLoading(true);
      await updateProfile(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Account Settings"
        subtitle="Manage your profile information and default currency settings."
      />

      <div style={{ maxWidth: '680px' }}>
        <Card style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                <CheckCircle size={18} />
                <span>Profile updated successfully!</span>
              </div>
            )}

            {error && (
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            {/* Avatar Pill Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700
                }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{user?.name}</h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>{user?.email}</p>
              </div>
            </div>

            <Input
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              icon={User}
              required
            />

            <Input
              label="Email Address"
              name="email"
              value={user?.email || ''}
              disabled
              icon={Mail}
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />

            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 555-0192"
              icon={Phone}
            />

            <div className="input-group">
              <label className="input-label" htmlFor="defaultCurrency">Preferred Currency</label>
              <select
                id="defaultCurrency"
                name="defaultCurrency"
                value={formData.defaultCurrency}
                onChange={handleChange}
                className="input-field"
              >
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="GBP">GBP (£ - British Pound)</option>
                <option value="INR">INR (₹ - Indian Rupee)</option>
                <option value="CAD">CAD (C$ - Canadian Dollar)</option>
                <option value="AUD">AUD (A$ - Australian Dollar)</option>
                <option value="JPY">JPY (¥ - Japanese Yen)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button type="submit" variant="primary" loading={loading} icon={Save}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Security Section */}
        <Card style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Shield size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Security & Authentication</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Your account is secured with JSON Web Token (JWT) stateless sessions and bcrypt password hashing.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
