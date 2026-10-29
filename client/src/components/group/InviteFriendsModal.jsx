import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Send, Users, Check } from 'lucide-react';
import { Button, Modal } from '../common';

const InviteFriendsModal = ({ isOpen, onClose, groups = [] }) => {
  const [groupId, setGroupId] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const selectedGroup = useMemo(() => groups.find((group) => group._id === groupId) || groups[0], [groups, groupId]);

  useEffect(() => {
    if (isOpen) {
      setGroupId(groups[0]?._id || '');
      setCopied(false);
      setError('');
    }
  }, [isOpen, groups]);

  const inviteMessage = selectedGroup
    ? `Join my group “${selectedGroup.name}” on Walleto!\n\nInvite code: ${selectedGroup.inviteCode}\n\nOpen ${window.location.origin}, sign in, then choose “Join with Code” and enter the invite code.`
    : '';

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopied(true);
      setError('');
    } catch {
      setError('Could not copy the invite. Please select and copy the code manually.');
    }
  };

  const shareInvite = async () => {
    if (!selectedGroup) return;
    const shareData = { title: `Join ${selectedGroup.name} on Walleto`, text: inviteMessage };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`, '_blank', 'noopener,noreferrer');
      }
      setError('');
    } catch (shareError) {
      if (shareError.name !== 'AbortError') setError('Could not open the share option. Copy the invite and send it manually.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite friends">
      {selectedGroup ? <div className="invite-modal-content">
        <div className="invite-modal-intro">
          <span className="invite-modal-icon"><Users size={20} /></span>
          <div><strong>Bring your people together</strong><p>Share a group invite so friends can join your shared expenses.</p></div>
        </div>

        <label className="invite-group-label" htmlFor="invite-group">Choose a group</label>
        <select id="invite-group" className="input-field" value={selectedGroup._id} onChange={(event) => { setGroupId(event.target.value); setCopied(false); }}>
          {groups.map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}
        </select>

        <div className="invite-code-panel">
          <span>INVITE CODE</span>
          <strong>{selectedGroup.inviteCode}</strong>
          <small>They can enter this from the “Join with Code” button.</small>
        </div>

        {error && <p className="invite-modal-error" role="alert">{error}</p>}
        <div className="invite-modal-actions">
          <Button variant="secondary" icon={copied ? Check : Copy} onClick={copyInvite}>{copied ? 'Invite copied' : 'Copy invite'}</Button>
          <Button variant="primary" icon={Send} onClick={shareInvite}>Share with friends</Button>
        </div>
      </div> : <div className="invite-modal-empty"><Users size={28} /><p>Create a group first, then invite friends to join it.</p></div>}
    </Modal>
  );
};

export default InviteFriendsModal;
