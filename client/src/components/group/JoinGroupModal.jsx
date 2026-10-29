import React, { useState } from 'react';
import { Modal, Input, Button, Card, Badge } from '../common';
import { groupService } from '../../services/groupService';
import { KeyRound, Users, UserCheck, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

const JoinGroupModal = ({ isOpen, onClose, onJoinSuccess }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReset = () => {
    setInviteCode('');
    setPreview(null);
    setError('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError('Please enter an invitation code');
      return;
    }

    try {
      setPreviewLoading(true);
      setError('');
      const data = await groupService.previewGroup(inviteCode.trim());
      setPreview(data.group);
    } catch (err) {
      setError(err.response?.data?.message || 'Group not found with this code');
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmJoin = async () => {
    try {
      setJoinLoading(true);
      setError('');
      await groupService.joinGroup(inviteCode.trim());
      if (onJoinSuccess) onJoinSuccess();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join group');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Join a Group">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Enter the shareable group code (e.g., <strong style={{ color: 'var(--primary)' }}>SPLT-8X2A</strong>) to preview and join.
        </p>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Code Input Form */}
        {!preview && (
          <form onSubmit={handlePreview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Shareable Invitation Code"
              name="inviteCode"
              placeholder="e.g. SPLT-8X2A"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase());
                setError('');
              }}
              icon={KeyRound}
              maxLength={12}
              style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, fontSize: '1.15rem', textAlign: 'center' }}
              required
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={handleClose} disabled={previewLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={previewLoading} icon={ArrowRight}>
                Validate & Preview Group
              </Button>
            </div>
          </form>
        )}

        {/* Preview Card */}
        {preview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'scaleIn 0.2s ease-out' }}>
            <Card style={{ background: 'var(--glass-card)', border: '1.5px solid rgba(211, 179, 107, 0.25)', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <Badge variant="primary" style={{ marginBottom: '0.5rem' }}>
                    Code: {preview.inviteCode}
                  </Badge>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {preview.name}
                  </h3>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(211, 179, 107, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 700 }}>
                  <Users size={16} />
                  <span>{preview.memberCount} Members</span>
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {preview.description || 'No description provided.'}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border-subtle)', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                <span>Created by <strong style={{ color: 'var(--text-muted)' }}>{preview.creatorName}</strong></span>
                <span>Currency: <strong style={{ color: 'var(--text-muted)' }}>{preview.currency}</strong></span>
              </div>
            </Card>

            {preview.isAlreadyMember ? (
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem' }}>
                ✓ You are already an active member of this group.
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={handleReset} disabled={joinLoading}>
                Change Code
              </Button>
              {!preview.isAlreadyMember && (
                <Button variant="success" loading={joinLoading} onClick={handleConfirmJoin} icon={UserCheck}>
                  Confirm & Join {preview.name}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default JoinGroupModal;
