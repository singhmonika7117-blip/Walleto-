const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']
    },
    avatar: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      enum: ['apartment', 'trip', 'couple', 'project', 'friends', 'other'],
      default: 'friends'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Group', groupSchema);
