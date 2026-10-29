import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

// Socket server URL configuration: prefers VITE_SOCKET_URL, falls back to direct dev port or root
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:5001'
    : '/');

// Module-level singleton socket connection to prevent duplicate connection churn
let sharedSocket = null;

const getSharedSocket = () => {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    sharedSocket.on('connect', () => {
      console.log('⚡ [Socket.io Client] Connected to real-time engine:', sharedSocket.id);
    });

    sharedSocket.on('connect_error', (err) => {
      console.warn('⚠️ [Socket.io Client] Connection error:', err.message);
    });
  }
  return sharedSocket;
};

/**
 * Custom React Hook: useSocket
 * Handles real-time room joining/leaving and synchronizes Phase 5 Expense Approvals
 * and Selective Bill Splitting state without requiring page refreshes.
 *
 * @param {string|null} groupId - Group room to join (e.g. "6655a1...")
 * @param {Object|Array} [options={}] - Options object or initial requests array
 * @param {Array} [options.initialRequests=[]] - Pre-fetched approvals array
 * @param {Function} [options.onNewApproval] - Callback when an approval is created
 * @param {Function} [options.onVoteUpdated] - Callback when a vote/share updates
 * @param {Function} [options.onApprovalFinalized] - Callback when an approval executes/cancels
 */
export const useSocket = (groupId = null, options = {}) => {
  const { user } = useAuth();
  const socketRef = useRef(getSharedSocket());

  // Support options passed as either an array (initialRequests) or an options config object
  const initialData = Array.isArray(options) ? options : options?.initialRequests || [];
  const [requests, setRequests] = useState(initialData);
  const [isConnected, setIsConnected] = useState(socketRef.current?.connected || false);

  // Sync internal state when external initialRequests change
  useEffect(() => {
    const freshInitial = Array.isArray(options) ? options : options?.initialRequests;
    if (freshInitial && freshInitial.length > 0) {
      setRequests(freshInitial);
    }
  }, [Array.isArray(options) ? JSON.stringify(options.map((r) => r._id)) : options?.initialRequests]);

  // Handle room joining, user channel authentication, and connection state
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);

      // Join user's private notification channel
      if (user?._id) {
        socket.emit('join_user', user._id);
      }

      // Join specific group room for realtime voting & selective splitting
      if (groupId) {
        socket.emit('join_group', groupId);
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // If already connected when effect runs, join immediately
    if (socket.connected) {
      if (user?._id) socket.emit('join_user', user._id);
      if (groupId) socket.emit('join_group', groupId);
      setIsConnected(true);
    }

    // Auto-leave group room on unmount or when groupId changes
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);

      if (groupId && socket.connected) {
        socket.emit('leave_group', groupId);
      }
    };
  }, [user?._id, groupId]);

  // Phase 5 Real-Time Listeners: APPROVAL_REQUEST_CREATED, VOTE_UPDATED, APPROVAL_FINALIZED
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    /**
     * 1. Live Approval Request Created Listener
     * Prepends new approval request into live list
     */
    const handleApprovalCreated = (payload) => {
      const newApproval = payload?.approval || payload?.request || payload;
      if (!newApproval || !newApproval._id) return;

      // Filter by groupId if the hook instance is scoped to a specific group
      const incomingGroupId = (newApproval.groupId?._id || newApproval.groupId)?.toString();
      if (groupId && incomingGroupId && incomingGroupId !== groupId.toString()) {
        return;
      }

      setRequests((prevRequests) => {
        const exists = prevRequests.some(
          (item) => (item._id || item.id)?.toString() === newApproval._id.toString()
        );
        if (exists) {
          return prevRequests.map((item) =>
            (item._id || item.id)?.toString() === newApproval._id.toString()
              ? { ...item, ...newApproval }
              : item
          );
        }
        return [newApproval, ...prevRequests];
      });

      if (typeof options?.onNewApproval === 'function') {
        options.onNewApproval(newApproval);
      }
    };

    /**
     * 2. Live Vote & Dynamic Selective Split Updated Listener
     * Updates member responses and per-member calculated shares in real-time
     */
    const handleVoteUpdated = (payload) => {
      const targetApprovalId = payload?.approvalId || payload?.approval?._id || payload?.id;
      if (!targetApprovalId) return;

      setRequests((prevRequests) =>
        prevRequests.map((item) => {
          const itemId = (item._id || item.id)?.toString();
          if (itemId !== targetApprovalId.toString()) return item;

          // If fully populated approval document is supplied
          if (payload.approval) {
            return {
              ...item,
              ...payload.approval,
              individualShare:
                payload.sharePerMember !== undefined
                  ? payload.sharePerMember
                  : payload.approval.individualShare ?? item.individualShare
            };
          }

          // Dynamically patch votes, participants, and per-member calculated shares
          const updatedVotes = payload.updatedResponses || payload.votes || item.votes;
          const updatedApproved = payload.approvedParticipants || item.approvedParticipants;
          const updatedRejected = payload.rejectedParticipants || item.rejectedParticipants;
          const updatedShare =
            payload.sharePerMember !== undefined
              ? payload.sharePerMember
              : payload.individualShare !== undefined
              ? payload.individualShare
              : item.individualShare;

          return {
            ...item,
            votes: updatedVotes,
            approvedParticipants: updatedApproved,
            rejectedParticipants: updatedRejected,
            individualShare: updatedShare
          };
        })
      );

      if (typeof options?.onVoteUpdated === 'function') {
        options.onVoteUpdated(payload);
      }
    };

    /**
     * 3. Live Approval Finalized Listener (Executed / Cancelled)
     * Updates status and marks finalized participants and execution details
     */
    const handleApprovalFinalized = (payload) => {
      const targetApprovalId = payload?.approvalId || payload?.approval?._id || payload?.id;
      if (!targetApprovalId) return;

      setRequests((prevRequests) =>
        prevRequests.map((item) => {
          const itemId = (item._id || item.id)?.toString();
          if (itemId !== targetApprovalId.toString()) return item;

          if (payload.approval) {
            return {
              ...item,
              ...payload.approval,
              status: payload.status || payload.approval.status || item.status
            };
          }

          return {
            ...item,
            status: payload.status || 'EXECUTED',
            approvedParticipants:
              payload.finalParticipants || payload.approvedParticipants || item.approvedParticipants,
            executionDetails: payload.executionDetails || item.executionDetails
          };
        })
      );

      if (typeof options?.onApprovalFinalized === 'function') {
        options.onApprovalFinalized(payload);
      }
    };

    // Register canonical Phase 5 event listeners
    socket.on('APPROVAL_REQUEST_CREATED', handleApprovalCreated);
    socket.on('VOTE_UPDATED', handleVoteUpdated);
    socket.on('APPROVAL_FINALIZED', handleApprovalFinalized);

    // Register legacy event listeners for backward compatibility
    socket.on('expense_request_created', handleApprovalCreated);
    socket.on('vote_updated', handleVoteUpdated);
    socket.on('expense_executed', handleApprovalFinalized);
    socket.on('expense_cancelled', handleApprovalFinalized);

    return () => {
      socket.off('APPROVAL_REQUEST_CREATED', handleApprovalCreated);
      socket.off('VOTE_UPDATED', handleVoteUpdated);
      socket.off('APPROVAL_FINALIZED', handleApprovalFinalized);

      socket.off('expense_request_created', handleApprovalCreated);
      socket.off('vote_updated', handleVoteUpdated);
      socket.off('expense_executed', handleApprovalFinalized);
      socket.off('expense_cancelled', handleApprovalFinalized);
    };
  }, [groupId, options?.onNewApproval, options?.onVoteUpdated, options?.onApprovalFinalized]);

  /**
   * Optimistically update a vote locally before the API roundtrip completes.
   * Dynamically recalculates approved/rejected counts and individual share in state.
   * Returns a rollback callback that restores the previous state if the API fails.
   *
   * @param {string} approvalId - Target approval ID
   * @param {'APPROVE'|'REJECT'} voteChoice - User's chosen vote
   * @param {Object|string} currentUser - Current user object or ID
   * @returns {Function} rollback - Invoked to restore previous state on error
   */
  const optimisticVote = useCallback((approvalId, voteChoice, currentUser) => {
    let previousState = null;

    setRequests((prev) => {
      previousState = prev;
      return prev.map((item) => {
        const itemId = (item._id || item.id)?.toString();
        if (itemId !== approvalId.toString()) return item;

        const currentUserId = (currentUser?._id || currentUser)?.toString();
        const existingVotes = Array.isArray(item.votes) ? [...item.votes] : [];
        const voteIndex = existingVotes.findIndex(
          (v) => (v.userId?._id || v.userId)?.toString() === currentUserId
        );

        if (voteIndex !== -1) {
          existingVotes[voteIndex] = {
            ...existingVotes[voteIndex],
            vote: voteChoice,
            votedAt: new Date()
          };
        } else {
          existingVotes.push({
            userId: typeof currentUser === 'object' ? currentUser : { _id: currentUserId },
            vote: voteChoice,
            votedAt: new Date()
          });
        }

        // Dynamically compute approved and rejected participants
        const approved = [];
        const rejected = [];
        existingVotes.forEach((v) => {
          const u = v.userId;
          if (v.vote === 'APPROVE') approved.push(u);
          else if (v.vote === 'REJECT') rejected.push(u);
        });

        // Dynamic Selective Split Formula: Total Amount / Approved Count
        const newIndividualShare =
          approved.length > 0
            ? Math.round((item.totalAmount / approved.length) * 100) / 100
            : 0;

        return {
          ...item,
          votes: existingVotes,
          approvedParticipants: approved,
          rejectedParticipants: rejected,
          individualShare: newIndividualShare
        };
      });
    });

    return () => {
      if (previousState) {
        setRequests(previousState);
      }
    };
  }, []);

  // Backward compatible helper methods for manual event registration
  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    requests,
    setRequests,
    optimisticVote,
    on,
    off,
    emit
  };
};

export default useSocket;
