const mongoose = require('mongoose');
const { APPROVAL_STATUS, VOTE_OPTIONS, EXPENSE_CATEGORIES } = require('../config/constants');

const voteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    vote: {
      type: String,
      enum: [VOTE_OPTIONS.APPROVE, VOTE_OPTIONS.REJECT],
      required: true
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const expenseApprovalSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total expense amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      default: 'food'
    },
    receiptUrl: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.VOTING
    },
    // Array of votes cast by members
    votes: [voteSchema],
    // Dynamic list of userIds who approved
    approvedParticipants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    // Dynamic list of userIds who rejected
    rejectedParticipants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    // Computed dynamically: totalAmount / approvedParticipants.length
    individualShare: {
      type: Number,
      default: 0
    },
    executionDetails: {
      executedAt: { type: Date },
      executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      totalDeducted: { type: Number, default: 0 },
      perPersonDeducted: { type: Number, default: 0 },
      participantsCharged: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ]
    },
    failureReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

expenseApprovalSchema.index({ groupId: 1, createdAt: -1 });
expenseApprovalSchema.index({ status: 1 });

module.exports = mongoose.model('ExpenseApproval', expenseApprovalSchema);
