const mongoose = require('mongoose');
const { SETTLEMENT_STATUS } = require('../config/constants');

const settlementSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    payerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    payeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Settlement amount must be positive']
    },
    currency: {
      type: String,
      default: 'USD'
    },
    status: {
      type: String,
      enum: Object.values(SETTLEMENT_STATUS),
      default: SETTLEMENT_STATUS.COMPLETED
    },
    paymentMethod: {
      type: String,
      enum: ['wallet', 'cash', 'upi', 'card', 'bank_transfer', 'other'],
      default: 'wallet'
    },
    proofUrl: {
      type: String,
      default: ''
    },
    settledAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

settlementSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('Settlement', settlementSchema);
