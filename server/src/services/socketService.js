const { Server } = require('socket.io');

let io = null;

/**
 * Normalizes group room name
 * @param {string} groupId
 * @returns {string} e.g. "group:6655a1b2c3d4e5f6a7b8c9d0"
 */
const getGroupRoom = (groupId) => {
  if (!groupId) return null;
  const str = groupId.toString();
  return str.startsWith('group:') ? str : `group:${str}`;
};

/**
 * Initialize Socket.io instance with robust CORS settings
 * @param {Object} httpServer - HTTP Server instance
 * @param {string} clientUrl - Allowed client origin
 */
const initSocket = (httpServer, clientUrls) => {
  const allowedOrigins = new Set([
    ...(Array.isArray(clientUrls) ? clientUrls : [clientUrls]),
    ...(process.env.NODE_ENV === 'production' ? [] : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ])
  ].filter(Boolean).map((origin) => origin.replace(/\/$/, '')));
  const isAllowedOrigin = (origin) => !origin || allowedOrigins.has(origin.replace(/\/$/, '')) ||
    (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow mobile apps, curl, Postman, or requests without origin
        return callback(null, isAllowedOrigin(origin));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.io] Client connected: ${socket.id}`);

    // Join user-specific private room for direct personal notifications
    socket.on('join_user', (userId) => {
      if (userId) {
        const userRoom = `user:${userId.toString()}`;
        socket.join(userRoom);
        console.log(`👤 Socket ${socket.id} joined personal room: ${userRoom}`);
      }
    });

    // Join group room for live voting & selective bill splitting sync
    socket.on('join_group', (groupId) => {
      if (groupId) {
        const room = getGroupRoom(groupId);
        socket.join(room);
        console.log(`👥 Socket ${socket.id} joined group room: ${room}`);
      }
    });

    // Support generic join room
    socket.on('join', (roomName) => {
      if (roomName) {
        const room = getGroupRoom(roomName);
        socket.join(room);
        console.log(`👥 Socket ${socket.id} joined room: ${room}`);
      }
    });

    // Leave group room
    socket.on('leave_group', (groupId) => {
      if (groupId) {
        const room = getGroupRoom(groupId);
        socket.leave(room);
        console.log(`👋 Socket ${socket.id} left group room: ${room}`);
      }
    });

    // Support generic leave room
    socket.on('leave', (roomName) => {
      if (roomName) {
        const room = getGroupRoom(roomName);
        socket.leave(room);
        console.log(`👋 Socket ${socket.id} left room: ${room}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ [Socket.io] Client disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  return io;
};

/**
 * Get active Socket.io instance
 */
const getIO = () => {
  return io;
};

/**
 * Emit event to a specific user
 * @param {string} userId
 * @param {string} event
 * @param {Object} data
 */
const emitToUser = (userId, event, data) => {
  if (io && userId) {
    io.to(`user:${userId.toString()}`).emit(event, data);
  }
};

/**
 * Emit event to all members in a group room
 * @param {string} groupId
 * @param {string} event
 * @param {Object} data
 */
const emitToGroup = (groupId, event, data) => {
  if (io && groupId) {
    const room = getGroupRoom(groupId);
    io.to(room).emit(event, data);
  }
};

/**
 * Broadcast event to all connected clients
 * @param {string} event
 * @param {Object} data
 */
const broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

/**
 * Broadcast when a new expense approval request is created
 * Notifies all members in the group room
 * @param {string} groupId - Target group ID
 * @param {Object} requestData - Populated ExpenseApproval document or object
 */
const notifyNewApprovalRequest = (groupId, requestData) => {
  if (!io || !groupId) return;
  const room = getGroupRoom(groupId);

  const cleanData = typeof requestData?.toObject === 'function' ? requestData.toObject() : requestData;

  const payload = {
    groupId: groupId.toString(),
    approvalId: cleanData?._id?.toString() || cleanData?.id?.toString(),
    request: cleanData,
    approval: cleanData,
    ...cleanData
  };

  // Broadcast canonical Phase 5 event
  io.to(room).emit('APPROVAL_REQUEST_CREATED', payload);
  // Emit legacy event for backward compatibility
  io.to(room).emit('expense_request_created', payload);

  console.log(`📢 [Socket.io] Broadcasted APPROVAL_REQUEST_CREATED to ${room} (Approval ID: ${payload.approvalId})`);
};

/**
 * Broadcast when a member casts or updates their live vote
 * Updates member votes and dynamically recalculates individual share
 * @param {string} groupId - Target group ID
 * @param {string} approvalId - Target ExpenseApproval ID
 * @param {Array} updatedResponses - Latest votes array
 * @param {number} sharePerMember - Dynamically calculated per-approved-member share
 * @param {Object} [extraData={}] - Optional populated approval & voter details
 */
const notifyVoteSubmitted = (groupId, approvalId, updatedResponses, sharePerMember, extraData = {}) => {
  if (!io || !groupId) return;
  const room = getGroupRoom(groupId);

  const payload = {
    groupId: groupId.toString(),
    approvalId: approvalId.toString(),
    updatedResponses,
    votes: updatedResponses,
    sharePerMember,
    individualShare: sharePerMember,
    ...extraData
  };

  // Broadcast canonical Phase 5 event
  io.to(room).emit('VOTE_UPDATED', payload);
  // Emit legacy event for backward compatibility
  io.to(room).emit('vote_updated', payload);

  console.log(
    `📢 [Socket.io] Broadcasted VOTE_UPDATED for approval ${approvalId} to ${room} (Per-member share: ₹${sharePerMember})`
  );
};

/**
 * Broadcast when an expense approval is finalized (executed or cancelled)
 * Settles bill and updates participating member shares & wallet balances
 * @param {string} groupId - Target group ID
 * @param {string} approvalId - Target ExpenseApproval ID
 * @param {string} status - Final status ('EXECUTED' | 'REJECTED' | 'CANCELLED')
 * @param {Array} finalParticipants - List of charged/approved participant IDs or objects
 * @param {Object} [extraData={}] - Optional execution & wallet balance details
 */
const notifyApprovalFinalized = (groupId, approvalId, status, finalParticipants, extraData = {}) => {
  if (!io || !groupId) return;
  const room = getGroupRoom(groupId);

  const payload = {
    groupId: groupId.toString(),
    approvalId: approvalId.toString(),
    status,
    finalParticipants,
    approvedParticipants: finalParticipants,
    ...extraData
  };

  // Broadcast canonical Phase 5 event
  io.to(room).emit('APPROVAL_FINALIZED', payload);
  // Emit legacy event for backward compatibility
  io.to(room).emit('approval_finalized', payload);

  if (status === 'EXECUTED') {
    io.to(room).emit('expense_executed', payload);
  } else if (status === 'CANCELLED') {
    io.to(room).emit('expense_cancelled', payload);
  }

  console.log(
    `📢 [Socket.io] Broadcasted APPROVAL_FINALIZED (${status}) for approval ${approvalId} to ${room} (${finalParticipants?.length || 0} participants)`
  );
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToGroup,
  broadcast,
  notifyNewApprovalRequest,
  notifyVoteSubmitted,
  notifyApprovalFinalized
};
