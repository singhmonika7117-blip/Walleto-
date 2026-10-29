const mongoose = require('mongoose');
const { SPLIT_TYPES, EXPENSE_STATUS, EXPENSE_CATEGORIES } = require('../config/constants');

const splitItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
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
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },
    currency: {
      type: String,
      default: 'USD'
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      default: 'other'
    },
    splitType: {
      type: String,
      enum: Object.values(SPLIT_TYPES),
      default: SPLIT_TYPES.EQUAL
    },
    splits: [splitItemSchema],
    status: {
      type: String,
      enum: Object.values(EXPENSE_STATUS),
      default: EXPENSE_STATUS.PENDING_APPROVAL
    },
    receiptUrl: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

expenseSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
