const mongoose = require('mongoose');
const ExpenseApproval = require('../models/ExpenseApproval');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const User = require('../models/User');
const GroupMembership = require('../models/GroupMembership');
const { APPROVAL_STATUS, VOTE_OPTIONS, TRANSACTION_TYPES, TRANSACTION_STATUS } = require('../config/constants');
const {
  emitToGroup,
  notifyNewApprovalRequest,
  notifyVoteSubmitted,
  notifyApprovalFinalized
} = require('../services/socketService');

/**
 * @desc    Create a new expense approval request (Starts in VOTING mode)
 * @route   POST /api/approvals
 * @access  Private
 */
const createExpenseApproval = async (req, res, next) => {
  try {
    const { groupId, title, description, totalAmount, category, receiptUrl } = req.body;

    if (!groupId || !title || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'groupId, title, and totalAmount are required'
      });
    }

    const numAmount = Number(totalAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total amount must be greater than zero'
      });
    }

    // Verify creator is an active group member
    const isMember = await GroupMembership.exists({
      groupId,
      userId: req.user._id,
      status: 'active'
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a group member to request an expense approval'
      });
    }

    // Creator automatically approves their own request
    const initialVotes = [
      {
        userId: req.user._id,
        vote: VOTE_OPTIONS.APPROVE,
        votedAt: new Date()
      }
    ];

    const approvedParticipants = [req.user._id];
    const individualShare = numAmount; // 1 participant initially

    const approval = await ExpenseApproval.create({
      groupId,
      createdBy: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      totalAmount: Math.round(numAmount * 100) / 100,
      category: category || 'food',
      receiptUrl: receiptUrl || '',
      status: APPROVAL_STATUS.VOTING,
      votes: initialVotes,
      approvedParticipants,
      rejectedParticipants: [],
      individualShare
    });

    const populated = await ExpenseApproval.findById(approval._id)
      .populate('createdBy', 'name email avatar')
      .populate('votes.userId', 'name email avatar')
      .populate('approvedParticipants', 'name email avatar');

    // Realtime broadcast to group via Phase 5 Socket service
    notifyNewApprovalRequest(groupId, populated);

    res.status(201).json({
      success: true,
      message: 'Expense approval request initiated',
      approval: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cast a live vote on an expense (YES, Approve or NO, Reject)
 *          Dynamic Selective Split Formula:
 *          Individual Share = Total Expense Amount ÷ Number of Approved Participants
 *          Members who reject or do not vote are charged ₹0.
 * @route   POST /api/approvals/:id/vote
 * @access  Private
 */
const submitVote = async (req, res, next) => {
  try {
    const { id: approvalId } = req.params;
    const { vote } = req.body;

    if (![VOTE_OPTIONS.APPROVE, VOTE_OPTIONS.REJECT].includes(vote)) {
      return res.status(400).json({
        success: false,
        message: `Vote must be either '${VOTE_OPTIONS.APPROVE}' or '${VOTE_OPTIONS.REJECT}'`
      });
    }

    const approval = await ExpenseApproval.findById(approvalId);
    if (!approval) {
      return res.status(404).json({ success: false, message: 'Expense approval request not found' });
    }

    if (approval.status !== APPROVAL_STATUS.VOTING) {
      return res.status(400).json({
        success: false,
        message: `Voting is closed. Current status is ${approval.status}`
      });
    }

    // Verify user is an active member of this group
    const isMember = await GroupMembership.exists({
      groupId: approval.groupId,
      userId: req.user._id,
      status: 'active'
    });

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Only group members can vote' });
    }

    // Update or insert user's vote (idempotent double-click protection)
    const existingVoteIndex = approval.votes.findIndex(
      (v) => v.userId.toString() === req.user._id.toString()
    );

    if (existingVoteIndex !== -1) {
      approval.votes[existingVoteIndex].vote = vote;
      approval.votes[existingVoteIndex].votedAt = new Date();
    } else {
      approval.votes.push({
        userId: req.user._id,
        vote,
        votedAt: new Date()
      });
    }

    // Recompute approved and rejected participant sets
    const approvedIds = [];
    const rejectedIds = [];

    approval.votes.forEach((v) => {
      if (v.vote === VOTE_OPTIONS.APPROVE) {
        approvedIds.push(v.userId);
      } else if (v.vote === VOTE_OPTIONS.REJECT) {
        rejectedIds.push(v.userId);
      }
    });

    approval.approvedParticipants = approvedIds;
    approval.rejectedParticipants = rejectedIds;

    // Apply Dynamic Selective Split Formula:
    // Individual Share = Total Expense Amount / Number of Approved Participants
    if (approvedIds.length > 0) {
      approval.individualShare = Math.round((approval.totalAmount / approvedIds.length) * 100) / 100;
    } else {
      approval.individualShare = 0;
    }

    // Save vote response to MongoDB
    await approval.save();

    const populated = await ExpenseApproval.findById(approval._id)
      .populate('createdBy', 'name email avatar')
      .populate('votes.userId', 'name email avatar')
      .populate('approvedParticipants', 'name email avatar')
      .populate('rejectedParticipants', 'name email avatar');

    // Real-time Socket.io broadcast AFTER saving vote response to MongoDB
    notifyVoteSubmitted(
      approval.groupId,
      approval._id,
      populated.votes,
      approval.individualShare,
      {
        approval: populated,
        approvedParticipants: populated.approvedParticipants,
        rejectedParticipants: populated.rejectedParticipants,
        voter: {
          _id: req.user._id,
          name: req.user.name
        },
        vote,
        approvedParticipantsCount: approvedIds.length
      }
    );

    res.status(200).json({
      success: true,
      message: `Vote recorded: ${vote}`,
      approval: populated
    });
  } catch (error) {
    next(error);
  }
};

const castVote = submitVote;

/**
 * @desc    Finalize Expense & perform Atomic Wallet Balance Deductions
 *          Executes inside an atomic MongoDB session (mongoose.startSession & session.startTransaction).
 *          Guards:
 *          1. Validates total expense amount <= total group wallet balance.
 *          2. Verifies each approved participant has sufficient individual contributed balance.
 *          If ANY participant has insufficient balance:
 *             - Aborts transaction (session.abortTransaction()).
 *             - Returns clear error message with deficient member details.
 *          On success:
 *             - Deducts shares from individual member balances in Wallet.
 *             - Logs transaction in WalletTransaction audit ledger.
 *             - Commits transaction (session.commitTransaction()).
 *             - Calls notifyApprovalFinalized right after commit.
 * @route   POST /api/approvals/:id/finalize
 * @route   POST /api/approvals/:id/execute
 * @access  Private
 */
const finalizeApproval = async (req, res, next) => {
  let session = null;

  try {
    const { id: approvalId } = req.params;

    // Standalone MongoDB does not support transactions. Use a transaction only
    // when the connected server is a replica set or mongos.
    const serverInfo = await mongoose.connection.db.admin().command({ hello: 1 });
    if (serverInfo.setName || serverInfo.msg === 'isdbgrid') {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    const approvalQuery = ExpenseApproval.findById(approvalId);
    if (session) approvalQuery.session(session);
    const approval = await approvalQuery;

    if (!approval) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({ success: false, message: 'Expense approval not found' });
    }

    const isGroupMember = await GroupMembership.exists({
      groupId: approval.groupId,
      userId: req.user._id,
      status: 'active'
    });
    if (!isGroupMember) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(403).json({ success: false, message: 'Only active group members can execute this expense' });
    }

    if (approval.status !== APPROVAL_STATUS.VOTING) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({
        success: false,
        message: `Cannot execute expense. It is currently in ${approval.status} status.`
      });
    }

    // Must have at least 1 approved participant
    const approvedCount = approval.approvedParticipants.length;
    if (approvedCount === 0) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({
        success: false,
        message: 'Cannot execute expense without any approved participants. At least 1 member must approve.'
      });
    }

    // Dynamic Selective Split Share per approved participant
    const perPersonShare = Math.round((approval.totalAmount / approvedCount) * 100) / 100;

    // Fetch Group's Shared Virtual Wallet within session
    const walletQuery = Wallet.findOne({ groupId: approval.groupId });
    if (session) walletQuery.session(session);
    const wallet = await walletQuery;

    if (!wallet) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({
        success: false,
        message: 'Group virtual wallet not found'
      });
    }

    // Guard 1: Validate total expense amount does NOT exceed total group wallet balance
    if (wallet.totalBalance < approval.totalAmount) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }

      const errMessage = `Insufficient Group Virtual Wallet Pool! Current Total: ₹${wallet.totalBalance}, Required: ₹${approval.totalAmount}`;
      
      emitToGroup(approval.groupId.toString(), 'wallet_insufficient', {
        groupId: approval.groupId,
        approvalId: approval._id,
        message: errMessage
      });

      return res.status(400).json({
        success: false,
        message: errMessage
      });
    }

    // Guard 2: Verify each approved participant has enough individual contributed funds
    const deficientMembers = [];
    for (const pId of approval.approvedParticipants) {
      const pIdStr = pId.toString();
      const contrib = wallet.contributions.find((c) => c.userId.toString() === pIdStr);
      const balance = contrib ? contrib.amount : 0;

      if (balance < perPersonShare) {
        const memberUser = await User.findById(pId).select('name email');
        deficientMembers.push({
          userId: pId,
          name: memberUser ? memberUser.name : 'Member',
          has: balance,
          needs: perPersonShare
        });
      }
    }

    // If ANY approved participant has insufficient individual balance: Abort transaction
    if (deficientMembers.length > 0) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }

      const detailStr = deficientMembers
        .map((m) => `${m.name} has ₹${m.has}, needs ₹${m.needs}`)
        .join('; ');
      const errMessage = `Execution Aborted: Insufficient contributed balance for approved participants: ${detailStr}. Please add funds to group wallet first.`;

      // Persist failure reason outside transaction for record
      try {
        await ExpenseApproval.findByIdAndUpdate(approval._id, { failureReason: errMessage });
      } catch (_) {}

      emitToGroup(approval.groupId.toString(), 'wallet_insufficient', {
        groupId: approval.groupId,
        approvalId: approval._id,
        deficientMembers,
        message: errMessage
      });

      return res.status(400).json({
        success: false,
        message: errMessage,
        deficientMembers
      });
    }

    // On successful transaction:
    // Deduct shares from individual member balances in Wallet
    for (const pId of approval.approvedParticipants) {
      const pIdStr = pId.toString();
      const contribIndex = wallet.contributions.findIndex((c) => c.userId.toString() === pIdStr);

      if (contribIndex !== -1) {
        wallet.contributions[contribIndex].amount =
          Math.round((wallet.contributions[contribIndex].amount - perPersonShare) * 100) / 100;
      }
    }

    // Deduct total amount from group wallet pool
    wallet.totalBalance = Math.max(
      0,
      Math.round((wallet.totalBalance - approval.totalAmount) * 100) / 100
    );

    if (session) {
      await wallet.save({ session });
    } else {
      await wallet.save();
    }

    // Update Expense Approval to EXECUTED
    approval.status = APPROVAL_STATUS.EXECUTED;
    approval.individualShare = perPersonShare;
    approval.failureReason = '';
    approval.executionDetails = {
      executedAt: new Date(),
      executedBy: req.user._id,
      totalDeducted: approval.totalAmount,
      perPersonDeducted: perPersonShare,
      participantsCharged: approval.approvedParticipants
    };

    if (session) {
      await approval.save({ session });
    } else {
      await approval.save();
    }

    // Log transaction in WalletTransaction audit ledger
    const transaction = new WalletTransaction({
      walletId: wallet._id,
      groupId: approval.groupId,
      userId: req.user._id,
      amount: approval.totalAmount,
      type: TRANSACTION_TYPES.EXPENSE_DEDUCTION,
      status: TRANSACTION_STATUS.COMPLETED,
      referenceId: approval._id,
      description: `Expense Deducted: "${approval.title}" (₹${perPersonShare} charged to ${approvedCount} approved participants)`
    });

    if (session) {
      await transaction.save({ session });
      // Commit atomic transaction
      await session.commitTransaction();
      session.endSession();
      session = null;
    } else {
      await transaction.save();
    }

    // Right AFTER committing database transaction:
    const populated = await ExpenseApproval.findById(approval._id)
      .populate('createdBy', 'name email avatar')
      .populate('votes.userId', 'name email avatar')
      .populate('approvedParticipants', 'name email avatar')
      .populate('rejectedParticipants', 'name email avatar')
      .populate('executionDetails.participantsCharged', 'name email avatar');

    // Real-time broadcast to group via notifyApprovalFinalized
    notifyApprovalFinalized(
      approval.groupId,
      approval._id,
      APPROVAL_STATUS.EXECUTED,
      populated.approvedParticipants,
      {
        approval: populated,
        wallet: {
          totalBalance: wallet.totalBalance,
          contributions: wallet.contributions
        },
        transaction
      }
    );

    emitToGroup(approval.groupId.toString(), 'wallet_updated', {
      groupId: approval.groupId,
      totalBalance: wallet.totalBalance,
      transaction
    });

    return res.status(200).json({
      success: true,
      message: `Expense executed successfully! ₹${perPersonShare} debited from each of the ${approvedCount} approved members.`,
      approval: populated,
      wallet: {
        totalBalance: wallet.totalBalance
      }
    });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (abortErr) {
        // ignore
      }
    }
    next(error);
  }
};

const executeExpenseApproval = finalizeApproval;

/**
 * @desc    Get pending approvals for user across their groups
 * @route   GET /api/approvals/pending
 * @access  Private
 */
const getPendingApprovals = async (req, res, next) => {
  try {
    const userMemberships = await GroupMembership.find({
      userId: req.user._id,
      status: 'active'
    });

    const groupIds = userMemberships.map((m) => m.groupId);

    const pendingApprovals = await ExpenseApproval.find({
      groupId: { $in: groupIds },
      status: APPROVAL_STATUS.VOTING
    })
      .populate('groupId', 'name currency inviteCode')
      .populate('createdBy', 'name email avatar')
      .populate('votes.userId', 'name email avatar')
      .populate('approvedParticipants', 'name email avatar')
      .populate('rejectedParticipants', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingApprovals.length,
      approvals: pendingApprovals
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get completed/executed approval history for user
 * @route   GET /api/approvals/history
 * @access  Private
 */
const getApprovalHistory = async (req, res, next) => {
  try {
    const userMemberships = await GroupMembership.find({
      userId: req.user._id,
      status: 'active'
    });

    const groupIds = userMemberships.map((m) => m.groupId);

    const history = await ExpenseApproval.find({
      groupId: { $in: groupIds },
      status: { $in: [APPROVAL_STATUS.EXECUTED, APPROVAL_STATUS.REJECTED, APPROVAL_STATUS.CANCELLED] }
    })
      .populate('groupId', 'name currency')
      .populate('createdBy', 'name email avatar')
      .populate('executionDetails.participantsCharged', 'name email avatar')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel an approval request (Creator only)
 * @route   POST /api/approvals/:id/cancel
 * @access  Private
 */
const cancelApproval = async (req, res, next) => {
  try {
    const approval = await ExpenseApproval.findById(req.params.id);
    if (!approval) {
      return res.status(404).json({ success: false, message: 'Expense approval request not found' });
    }

    if (approval.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator of this approval request can cancel it'
      });
    }

    approval.status = APPROVAL_STATUS.CANCELLED;
    await approval.save();

    // Realtime broadcast to group: approval cancelled
    notifyApprovalFinalized(
      approval.groupId,
      approval._id,
      APPROVAL_STATUS.CANCELLED,
      [],
      {
        approval,
        cancelledBy: req.user._id
      }
    );

    res.status(200).json({
      success: true,
      message: 'Expense approval request cancelled',
      approval
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExpenseApproval,
  castVote,
  submitVote,
  executeExpenseApproval,
  finalizeApproval,
  getPendingApprovals,
  getApprovalHistory,
  cancelApproval
};
