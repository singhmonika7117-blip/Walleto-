import React, { useState, useEffect } from 'react';
import { Input, Button, Tooltip } from '../common';
import { calculateItemizedShares } from '../../utils/billSplitter';
import { formatCurrency } from '../../utils/formatters';
import { Users, Plus, Trash2, CheckCircle } from 'lucide-react';

/**
 * ItemizedSplitter component
 * Allows the creator to build an itemised bill, assign line items to members,
 * and see each member's calculated share (including tax & tip).
 *
 * Props:
 *   members: array of group members [{ _id, name }]
 *   onSubmit: function(payload) => void – receives an array of { userId, requiredShare }
 *   currency: optional currency code (default 'USD')
 */
const ItemizedSplitter = ({ members = [], onSubmit, currency = 'USD' }) => {
  const [total, setTotal] = useState('');
  const [tax, setTax] = useState('');
  const [tip, setTip] = useState('');
  const [lineItems, setLineItems] = useState([
    { name: '', price: '', assignedUserIds: [] },
  ]);
  const [shares, setShares] = useState({});
  const [error, setError] = useState('');

  // Re‑calculate shares whenever inputs change
  useEffect(() => {
    const numTotal = Number(total) || 0;
    const numTax = Number(tax) || 0;
    const numTip = Number(tip) || 0;
    // Filter out empty items
    const validItems = lineItems.filter(i => i.name && Number(i.price) > 0 && i.assignedUserIds.length > 0);
    const calculated = calculateItemizedShares(validItems, numTax, numTip);
    setShares(calculated);
  }, [total, tax, tip, lineItems]);

  const handleItemChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const toggleAssignment = (itemIdx, userId) => {
    const updated = [...lineItems];
    const assigned = updated[itemIdx].assignedUserIds || [];
    if (assigned.includes(userId)) {
      updated[itemIdx].assignedUserIds = assigned.filter(id => id !== userId);
    } else {
      updated[itemIdx].assignedUserIds = [...assigned, userId];
    }
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { name: '', price: '', assignedUserIds: [] }]);
  };

  const removeLineItem = idx => {
    const filtered = lineItems.filter((_, i) => i !== idx);
    setLineItems(filtered.length ? filtered : [{ name: '', price: '', assignedUserIds: [] }]);
  };

  const handleSubmit = () => {
    // Validate that every member with a share is accounted for
    const payload = Object.entries(shares).map(([userId, requiredShare]) => ({ userId, requiredShare }));
    if (payload.length === 0) {
      setError('No shares calculated – please add items and assign members.');
      return;
    }
    if (onSubmit) onSubmit(payload);
  };

  // UI for each member’s preview (glassmorphic style)
  const MemberPreview = ({ userId, name }) => {
    const share = shares[userId] ?? 0;
    return (
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem',
        marginBottom: '0.5rem',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.12)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'var(--text-main)'
      }}>
        <span style={{ fontWeight: 600 }}>{name}</span>
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(share, currency)}</span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        <Input
          label="Total"
          placeholder="Bill total"
          value={total}
          onChange={e => setTotal(e.target.value)}
          type="number"
          step="0.01"
          icon={Users}
        />
        <Input
          label="Tax"
          placeholder="Tax amount"
          value={tax}
          onChange={e => setTax(e.target.value)}
          type="number"
          step="0.01"
        />
        <Input
          label="Tip"
          placeholder="Tip amount"
          value={tip}
          onChange={e => setTip(e.target.value)}
          type="number"
          step="0.01"
        />
      </div>

      {/* Line items table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <h4 style={{ margin: 0, fontWeight: 600 }}>Line Items</h4>
          <Button variant="secondary" onClick={addLineItem} size="sm" icon={Plus}>Add Item</Button>
        </div>
        {lineItems.map((item, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <Input
              placeholder="Item name"
              value={item.name}
              onChange={e => handleItemChange(idx, 'name', e.target.value)}
            />
            <Input
              placeholder="Price"
              type="number"
              step="0.01"
              value={item.price}
              onChange={e => handleItemChange(idx, 'price', e.target.value)}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {members.map(m => (
                <Tooltip key={m._id} content={m.name}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={item.assignedUserIds.includes(m._id)}
                      onChange={() => toggleAssignment(idx, m._id)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                  </label>
                </Tooltip>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeLineItem(idx)} icon={Trash2} />
          </div>
        ))}
      </div>

      {/* Share preview */}
      <div>
        <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Member Shares</h4>
        {members.map(m => (
          <MemberPreview key={m._id} userId={m._id} name={m.name} />
        ))}
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</div>
      )}

      <Button variant="primary" onClick={handleSubmit} icon={CheckCircle}>Create Approval Request</Button>
    </div>
  );
};

export default ItemizedSplitter;
