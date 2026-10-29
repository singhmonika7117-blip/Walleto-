import React, { useState } from 'react';
import { Modal, Input, Button } from '../common';
import { Users, FolderPlus } from 'lucide-react';

const CreateGroupModal = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'friends',
    currency: 'INR'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }

    try {
      setLoading(true);
      await onCreate(formData);
      setFormData({ name: '', description: '', category: 'friends', currency: 'INR' });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Split Group">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <Input
          label="Group Name"
          name="name"
          placeholder="e.g. Goa Trip 2026, Flat 402 Expenses"
          value={formData.name}
          onChange={handleChange}
          icon={Users}
          required
        />

        <div className="input-group">
          <label className="input-label" htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="What is this group for?"
            value={formData.description}
            onChange={handleChange}
            className="input-field"
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="grid-2">
          <div className="input-group">
            <label className="input-label" htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="input-field"
            >
              <option value="friends">🎉 Friends</option>
              <option value="trip">✈️ Trip & Travel</option>
              <option value="apartment">🏠 Apartment / Flat</option>
              <option value="couple">❤️ Couple</option>
              <option value="project">💼 Project</option>
              <option value="other">📁 Other</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="currency">Currency</label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="input-field"
            >
              <option value="INR">INR (₹ - Indian Rupee)</option>
              <option value="USD">USD ($ - US Dollar)</option>
              <option value="EUR">EUR (€ - Euro)</option>
              <option value="GBP">GBP (£ - British Pound)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} icon={FolderPlus}>
            Create Group & Wallet
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateGroupModal;
