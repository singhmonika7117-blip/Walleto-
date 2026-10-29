import React, { useState } from 'react';
import { Input, Button } from '../common';
import { notificationService } from '../../services/notificationService';
import { Receipt, IndianRupee, Sparkles, FileText, Tag } from 'lucide-react';
import { validateAmount } from '../../utils/validators';

const ExpenseForm = ({ groupId, currency = 'INR', onExpenseCreated, onClose }) => {
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { id: 'food', label: '🍔 Food & Dining' },
    { id: 'transport', label: '🚗 Transport & Fuel' },
    { id: 'utilities', label: '💡 Utilities & Bills' },
    { id: 'entertainment', label: '🍿 Entertainment' },
    { id: 'shopping', label: '🛍️ Shopping' },
    { id: 'travel', label: '✈️ Travel & Stay' },
    { id: 'health', label: '💊 Health & Medical' },
    { id: 'other', label: '📦 Other Expenses' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Expense title is required');
      return;
    }

    const amtErr = validateAmount(totalAmount);
    if (amtErr) {
      setError(amtErr);
      return;
    }

    const numAmount = Number(totalAmount);

    try {
      setLoading(true);
      setError('');
      await notificationService.createExpenseApproval({
        groupId,
        title: title.trim(),
        description: description.trim(),
        totalAmount: numAmount,
        category
      });

      if (onExpenseCreated) onExpenseCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create expense request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ background: 'rgba(211, 179, 107, 0.06)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', border: '1px solid rgba(211, 179, 107, 0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
          <Sparkles size={14} />
          <span>Selective Splitting Workflow</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          This bill will be submitted to the group for real-time consensus voting. Each member who clicks <strong>YES</strong> will be charged an equal share (Total ÷ Approved Count). Rejecting members pay ₹0.
        </p>
      </div>

      <Input
        label="Expense Title"
        name="title"
        placeholder="e.g. Team Dinner, Hotel Booking, Groceries"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        icon={Receipt}
        required
      />

      <div className="grid-2">
        <Input
          label={`Total Amount (${currency})`}
          name="totalAmount"
          type="number"
          step="0.01"
          min="1"
          placeholder="0.00"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          icon={IndianRupee}
          required
        />

        <div className="input-group">
          <label className="input-label" htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="description">Notes / Receipt Context (optional)</label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Details about where or why this expense occurred..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field"
          style={{ resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading} icon={Receipt}>
          Submit for Live Voting
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;
