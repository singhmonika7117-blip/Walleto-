import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const SplitSelector = ({
  splitType,
  setSplitType,
  members = [],
  splitsState,
  setSplitsState,
  totalAmount = 0,
  currency = 'USD'
}) => {
  const modes = [
    { id: 'EQUAL', label: '= Equal', desc: 'Split evenly' },
    { id: 'EXACT', label: '$ Exact', desc: 'Specify amounts' },
    { id: 'PERCENTAGE', label: '% Percentage', desc: 'Split by %' },
    { id: 'SHARES', label: '📊 Shares', desc: 'Split by parts' }
  ];

  // Helper for EQUAL: toggle member participation
  const toggleEqualMember = (userId) => {
    const current = splitsState.equalParticipants || members.map((m) => m._id);
    let next;
    if (current.includes(userId)) {
      if (current.length === 1) return; // Keep at least one
      next = current.filter((id) => id !== userId);
    } else {
      next = [...current, userId];
    }
    setSplitsState({ ...splitsState, equalParticipants: next });
  };

  // Helper for EXACT: update dollar amount
  const handleExactChange = (userId, value) => {
    const exactMap = { ...(splitsState.exactMap || {}) };
    exactMap[userId] = value;
    setSplitsState({ ...splitsState, exactMap });
  };

  // Helper for PERCENTAGE: update percentage
  const handlePercentageChange = (userId, value) => {
    const pctMap = { ...(splitsState.percentageMap || {}) };
    pctMap[userId] = value;
    setSplitsState({ ...splitsState, percentageMap: pctMap });
  };

  // Helper for SHARES: update share weight
  const handleSharesChange = (userId, value) => {
    const sharesMap = { ...(splitsState.sharesMap || {}) };
    sharesMap[userId] = Math.max(1, parseInt(value, 10) || 1);
    setSplitsState({ ...splitsState, sharesMap });
  };

  // Calculations for summaries
  const numTotal = Number(totalAmount) || 0;
  const equalParticipants = splitsState.equalParticipants || members.map((m) => m._id);
  const equalShare = equalParticipants.length > 0 ? (numTotal / equalParticipants.length) : 0;

  // Exact summary
  const exactSum = Object.values(splitsState.exactMap || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);
  const exactDiff = Math.round((numTotal - exactSum) * 100) / 100;

  // Percentage summary
  const pctSum = Object.values(splitsState.percentageMap || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);
  const pctDiff = Math.round((100 - pctSum) * 100) / 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Split Mode Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.375rem', backgroundColor: 'var(--bg-input)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setSplitType(mode.id)}
            style={{
              padding: '0.5rem 0.25rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: splitType === mode.id ? 'var(--primary)' : 'transparent',
              color: splitType === mode.id ? '#fff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Mode-specific participant selector */}
      <div style={{ backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '0.875rem', border: '1px solid var(--border)' }}>
        {splitType === 'EQUAL' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Members Included ({equalParticipants.length}):</span>
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                {formatCurrency(equalShare, currency)} / person
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {members.map((member) => {
                const isSelected = equalParticipants.includes(member._id);
                return (
                  <label
                    key={member._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--bg-card-hover)' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEqualMember(member._id)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{member.name}</span>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {formatCurrency(equalShare, currency)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {splitType === 'EXACT' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Allocated: ${exactSum.toFixed(2)} / ${numTotal.toFixed(2)}</span>
              <span style={{ color: exactDiff === 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                {exactDiff === 0 ? 'Exact match ✓' : `${exactDiff > 0 ? '$' + exactDiff.toFixed(2) + ' remaining' : '$' + Math.abs(exactDiff).toFixed(2) + ' over'}`}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {members.map((member) => (
                <div key={member._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', flex: 1 }}>{member.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={splitsState.exactMap?.[member._id] ?? ''}
                      onChange={(e) => handleExactChange(member._id, e.target.value)}
                      className="input-field"
                      style={{ width: '90px', padding: '0.375rem 0.5rem', textAlign: 'right' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {splitType === 'PERCENTAGE' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Percentage: {pctSum}%</span>
              <span style={{ color: pctDiff === 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                {pctDiff === 0 ? '100% ✓' : `${pctDiff > 0 ? pctDiff + '% remaining' : Math.abs(pctDiff) + '% over'}`}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {members.map((member) => {
                const userPct = Number(splitsState.percentageMap?.[member._id]) || 0;
                const userAmt = (numTotal * userPct) / 100;
                return (
                  <div key={member._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{member.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '0.5rem' }}>
                        ({formatCurrency(userAmt, currency)})
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={splitsState.percentageMap?.[member._id] ?? ''}
                        onChange={(e) => handlePercentageChange(member._id, e.target.value)}
                        className="input-field"
                        style={{ width: '75px', padding: '0.375rem 0.5rem', textAlign: 'right' }}
                      />
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {splitType === 'SHARES' && (
          <div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Assign relative shares (e.g. 2 for couples, 1 for singles).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {members.map((member) => (
                <div key={member._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', flex: 1 }}>{member.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={splitsState.sharesMap?.[member._id] || 1}
                      onChange={(e) => handleSharesChange(member._id, e.target.value)}
                      className="input-field"
                      style={{ width: '70px', padding: '0.375rem 0.5rem', textAlign: 'center' }}
                    />
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>share(s)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplitSelector;
