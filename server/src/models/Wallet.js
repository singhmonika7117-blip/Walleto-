const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Contribution cannot be negative']
    }
  },
  { _id: false }
);

const walletSchema = new mongoose.Schema(
  {
    // If set, this represents a Group Shared Virtual Wallet
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    // If set, this represents an individual user's personal virtual wallet
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    totalBalance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total wallet balance cannot be negative']
    },
    processedProviderPaymentIds: {
      type: [String],
      default: []
    },
    currency: {
      type: String,
      default: 'INR'
    },
    // Tracks each member's individual contributed funds in the shared wallet
    contributions: [contributionSchema]
  },
  {
    timestamps: true
  }
);

walletSchema.index({ groupId: 1 }, { unique: true, sparse: true });
walletSchema.index({ userId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Wallet', walletSchema);
