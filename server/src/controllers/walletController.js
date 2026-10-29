const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const Group = require('../models/Group');
const GroupMembership = require('../models/GroupMembership');
const PaymentService = require('../services/paymentService');
const { TRANSACTION_TYPES, TRANSACTION_STATUS } = require('../config/constants');

const getWallet = async (req, res, next) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: req.user._id,
        totalBalance: 0,
        currency: req.user.defaultCurrency || 'INR'
      });
    }

    const recentTransactions = await WalletTransaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      wallet: {
        _id: wallet._id,
        balance: wallet.totalBalance,
        totalBalance: wallet.totalBalance,
        currency: wallet.currency
      },
      recentTransactions
    });
  } catch (error) {
    return next(error);
  }
};

const createDepositOrder = async (req, res, next) => {
  let transaction;
  try {
    const amount = Number(req.body.amount);
    const groupId = req.body.groupId || null;
    if (!Number.isFinite(amount) || amount < 1 || Math.round(amount * 100) !== amount * 100) {
      return res.status(400).json({ success: false, message: 'Enter an amount of at least ₹1 with up to 2 decimal places.' });
    }

    const clientConfig = PaymentService.getClientConfig();
    let wallet;
    if (groupId) {
      const membership = await GroupMembership.exists({
        groupId,
        userId: req.user._id,
        status: 'active'
      });
      if (!membership) {
        return res.status(403).json({ success: false, message: 'Only active group members can contribute.' });
      }
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });
      if ((group.currency || 'INR') !== 'INR') {
        return res.status(400).json({ success: false, message: 'Razorpay test checkout currently supports INR group wallets only.' });
      }
      wallet = await Wallet.findOne({ groupId });
      if (!wallet) {
        wallet = await Wallet.create({
          groupId,
          totalBalance: 0,
          currency: 'INR',
          contributions: [{ userId: req.user._id, amount: 0 }]
        });
      }
    } else {
      wallet = await Wallet.findOne({ userId: req.user._id });
      if (!wallet) {
        wallet = await Wallet.create({
          userId: req.user._id,
          totalBalance: 0,
          currency: req.user.defaultCurrency || 'INR'
        });
      }
      if (wallet.currency !== 'INR') {
        return res.status(400).json({ success: false, message: 'Razorpay test checkout currently supports INR wallets only.' });
      }
    }

    transaction = await WalletTransaction.create({
      walletId: wallet._id,
      groupId: groupId || undefined,
      userId: req.user._id,
      amount,
      type: TRANSACTION_TYPES.DEPOSIT,
      status: TRANSACTION_STATUS.PENDING,
      provider: 'razorpay',
      description: 'Razorpay test payment pending'
    });

    const order = await PaymentService.createOrder({
      amountPaise: Math.round(amount * 100),
      receipt: transaction._id.toString(),
      transactionId: transaction._id.toString()
    });
    transaction.providerOrderId = order.id;
    await transaction.save();

    return res.status(201).json({
      success: true,
      order: {
        keyId: clientConfig.keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        name: 'Walleto',
        description: groupId ? 'Group wallet contribution (test payment)' : 'Personal wallet top-up (test payment)'
      }
    });
  } catch (error) {
    if (transaction && transaction.status === TRANSACTION_STATUS.PENDING && !transaction.providerOrderId) {
      transaction.status = TRANSACTION_STATUS.FAILED;
      transaction.description = 'Razorpay test order creation failed';
      await transaction.save().catch(() => {});
    }
    return next(error);
  }
};

const verifyDeposit = async (req, res, next) => {
  try {
    const result = await PaymentService.verifyCheckoutPayment({
      userId: req.user._id,
      orderId: req.body.razorpay_order_id,
      paymentId: req.body.razorpay_payment_id,
      signature: req.body.razorpay_signature
    });

    return res.status(200).json({
      success: true,
      message: 'Test payment verified and wallet updated.',
      wallet: {
        _id: result.wallet._id,
        balance: result.wallet.totalBalance,
        totalBalance: result.wallet.totalBalance,
        currency: result.wallet.currency
      },
      transaction: result.transaction
    });
  } catch (error) {
    return next(error);
  }
};

const createDepositQr = async (req, res, next) => {
  let transaction;
  try {
    const amount = Number(req.body.amount);
    const groupId = req.body.groupId || null;
    if (!Number.isFinite(amount) || amount < 1 || Math.round(amount * 100) !== amount * 100) return res.status(400).json({ success: false, message: 'Enter an amount of at least ₹1 with up to 2 decimal places.' });
    PaymentService.getClientConfig();
    let wallet;
    if (groupId) {
      const membership = await GroupMembership.exists({ groupId, userId: req.user._id, status: 'active' });
      if (!membership) return res.status(403).json({ success: false, message: 'Only active group members can contribute.' });
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });
      if ((group.currency || 'INR') !== 'INR') return res.status(400).json({ success: false, message: 'Razorpay QR payments currently support INR group wallets only.' });
      wallet = await Wallet.findOne({ groupId });
      if (!wallet) wallet = await Wallet.create({ groupId, totalBalance: 0, currency: 'INR', contributions: [{ userId: req.user._id, amount: 0 }] });
    } else {
      wallet = await Wallet.findOne({ userId: req.user._id });
      if (!wallet) wallet = await Wallet.create({ userId: req.user._id, totalBalance: 0, currency: req.user.defaultCurrency || 'INR' });
      if (wallet.currency !== 'INR') return res.status(400).json({ success: false, message: 'Razorpay QR payments currently support INR wallets only.' });
    }
    transaction = await WalletTransaction.create({ walletId: wallet._id, groupId: groupId || undefined, userId: req.user._id, amount, type: TRANSACTION_TYPES.DEPOSIT, status: TRANSACTION_STATUS.PENDING, provider: 'razorpay', description: 'Razorpay QR payment pending' });
    const qr = await PaymentService.createQrCode({ amountPaise: Math.round(amount * 100), transactionId: transaction._id.toString(), description: groupId ? 'Walleto group contribution' : 'Walleto wallet top-up' });
    transaction.providerQrCodeId = qr.id;
    await transaction.save();
    return res.status(201).json({ success: true, qr: { id: qr.id, imageUrl: qr.image_url, amount, currency: 'INR' } });
  } catch (error) {
    if (transaction && !transaction.providerQrCodeId) {
      transaction.status = TRANSACTION_STATUS.FAILED;
      transaction.description = 'Razorpay QR creation failed';
      await transaction.save().catch(() => {});
    }
    return next(error);
  }
};

const checkDepositQr = async (req, res, next) => {
  try {
    const transaction = await WalletTransaction.findOne({ provider: 'razorpay', providerQrCodeId: req.params.qrCodeId, userId: req.user._id });
    if (!transaction) return res.status(404).json({ success: false, message: 'QR payment was not found for this account.' });
    if (transaction.status === TRANSACTION_STATUS.COMPLETED) return res.json({ success: true, paid: true });
    const payments = await PaymentService.fetchQrPayments(transaction.providerQrCodeId);
    const payment = (payments.items || []).find((item) => item.status === 'captured');
    if (!payment) return res.json({ success: true, paid: false });
    if (payment.amount !== Math.round(transaction.amount * 100) || payment.currency !== 'INR') throw Object.assign(new Error('QR payment amount does not match this contribution.'), { statusCode: 400 });
    const result = await PaymentService.settleQrPayment(transaction, payment);
    return res.json({ success: true, paid: Boolean(result) });
  } catch (error) { return next(error); }
};

const withdrawFunds = async (req, res) => {
  return res.status(503).json({
    success: false,
    message: 'Bank payouts are not enabled in this test-payment phase. No funds were moved.'
  });
};

const getTransactionHistory = async (req, res, next) => {
  try {
    const transactions = await WalletTransaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getWallet,
  createDepositOrder,
  createDepositQr,
  checkDepositQr,
  verifyDeposit,
  withdrawFunds,
  getTransactionHistory
};
