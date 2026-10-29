const mongoose = require('mongoose');
const { TRANSACTION_TYPES, TRANSACTION_STATUS } = require('../config/constants');

const walletTransactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: true
    },
    status: {
      type: String,
      enum: Object.values(TRANSACTION_STATUS),
      default: TRANSACTION_STATUS.COMPLETED
    },
    provider: { type: String, default: undefined },
    providerOrderId: { type: String, default: undefined },
    providerQrCodeId: { type: String, default: undefined },
    providerPaymentId: { type: String, default: undefined },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExpenseApproval'
    },
    description: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

walletTransactionSchema.index({ groupId: 1, createdAt: -1 });
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ providerOrderId: 1 }, { unique: true, sparse: true });
walletTransactionSchema.index({ providerQrCodeId: 1 }, { unique: true, sparse: true });
walletTransactionSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
