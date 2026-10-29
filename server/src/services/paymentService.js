const crypto = require('crypto');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const { TRANSACTION_STATUS } = require('../config/constants');
const { emitToGroup, emitToUser } = require('./socketService');

const API_BASE = 'https://api.razorpay.com/v1';

class PaymentService {
  static getCredentials() {
    const mode = process.env.RAZORPAY_MODE || 'test';
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (mode !== 'test') {
      throw Object.assign(new Error('Only Razorpay test mode is enabled.'), { statusCode: 503 });
    }
    if (!keyId || !keySecret || !keyId.startsWith('rzp_test_')) {
      throw Object.assign(new Error('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to server/.env using test-mode keys, then restart the server.'), {
        statusCode: 503
      });
    }

    return { keyId, keySecret };
  }

  static getClientConfig() {
    const { keyId } = this.getCredentials();
    return { keyId, currency: 'INR', mode: 'test' };
  }

  static async request(path, options = {}) {
    const { keyId, keySecret } = this.getCredentials();
    const auth = Buffer.from(keyId + ':' + keySecret).toString('base64');
    let response;
    try {
      response = await fetch(API_BASE + path, {
        ...options,
        signal: options.signal || AbortSignal.timeout(15000),
        headers: {
          Authorization: 'Basic ' + auth,
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw Object.assign(new Error('Razorpay did not respond in time. Please try again.'), { statusCode: 504 });
      }
      throw Object.assign(new Error('Could not reach Razorpay. Check the server internet connection and try again.'), { statusCode: 502 });
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = payload.error?.description || 'Payment provider request failed.';
      throw Object.assign(new Error(providerMessage), { statusCode: 502 });
    }
    return payload;
  }

  static async createOrder({ amountPaise, receipt, transactionId }) {
    if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
      throw Object.assign(new Error('Payment amount must be at least ₹1.'), { statusCode: 400 });
    }

    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: { transactionId }
      })
    });
  }

  static async createQrCode({ amountPaise, transactionId, description }) {
    if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
      throw Object.assign(new Error('Payment amount must be at least ₹1.'), { statusCode: 400 });
    }
    return this.request('/payments/qr_codes', {
      method: 'POST',
      body: JSON.stringify({ type: 'upi_qr', name: 'Walleto', usage: 'single_use', fixed_amount: true, payment_amount: amountPaise, description, notes: { transactionId } })
    });
  }

  static async fetchQrPayments(qrCodeId) {
    return this.request('/payments/qr_codes/' + encodeURIComponent(qrCodeId) + '/payments?count=100', { method: 'GET' });
  }

  static verifyCheckoutSignature(orderId, paymentId, signature) {
    const secret = this.getCredentials().keySecret;
    if (!orderId || !paymentId || !signature) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(orderId + '|' + paymentId)
      .digest();
    let supplied;
    try {
      supplied = Buffer.from(signature, 'hex');
    } catch {
      return false;
    }
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
  }

  static verifyWebhookSignature(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !Buffer.isBuffer(rawBody) || !signature) return false;

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
    let supplied;
    try {
      supplied = Buffer.from(signature, 'hex');
    } catch {
      return false;
    }
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
  }

  static async fetchPayment(paymentId) {
    return this.request('/payments/' + encodeURIComponent(paymentId), { method: 'GET' });
  }

  static async verifyCheckoutPayment({ userId, orderId, paymentId, signature }) {
    if (!this.verifyCheckoutSignature(orderId, paymentId, signature)) {
      throw Object.assign(new Error('Payment signature could not be verified.'), { statusCode: 400 });
    }

    const transaction = await WalletTransaction.findOne({
      provider: 'razorpay',
      providerOrderId: orderId,
      userId
    });
    if (!transaction) {
      throw Object.assign(new Error('Payment order was not found for this account.'), { statusCode: 404 });
    }

    const payment = await this.fetchPayment(paymentId);
    if (payment.order_id !== orderId || payment.status !== 'captured') {
      throw Object.assign(new Error('Payment has not been captured yet.'), { statusCode: 409 });
    }
    if (payment.amount !== Math.round(transaction.amount * 100) || payment.currency !== 'INR') {
      throw Object.assign(new Error('Captured payment does not match the order amount.'), { statusCode: 400 });
    }

    return this.settleCapturedPayment(payment);
  }

  static async settleCapturedPayment(payment) {
    if (!payment || payment.status !== 'captured' || !payment.id || !payment.order_id) return null;

    const transaction = await WalletTransaction.findOne({
      provider: 'razorpay',
      providerOrderId: payment.order_id
    });
    if (!transaction) return null;

    if (payment.amount !== Math.round(transaction.amount * 100) || payment.currency !== 'INR') {
      throw new Error('Captured payment does not match the stored order.');
    }
    if (transaction.providerPaymentId && transaction.providerPaymentId !== payment.id) {
      throw new Error('A different payment is already linked to this order.');
    }

    const wallet = await Wallet.findById(transaction.walletId);
    if (!wallet) throw new Error('Wallet for captured payment was not found.');

    let updateResult;
    if (transaction.groupId) {
      await Wallet.updateOne(
        { _id: wallet._id, 'contributions.userId': { $ne: transaction.userId } },
        { $push: { contributions: { userId: transaction.userId, amount: 0 } } }
      );

      updateResult = await Wallet.updateOne(
        {
          _id: wallet._id,
          processedProviderPaymentIds: { $ne: payment.id },
          'contributions.userId': transaction.userId
        },
        {
          $inc: {
            totalBalance: transaction.amount,
            'contributions.$[contribution].amount': transaction.amount
          },
          $addToSet: { processedProviderPaymentIds: payment.id }
        },
        { arrayFilters: [{ 'contribution.userId': transaction.userId }] }
      );
    } else {
      updateResult = await Wallet.updateOne(
        { _id: wallet._id, processedProviderPaymentIds: { $ne: payment.id } },
        {
          $inc: { totalBalance: transaction.amount },
          $addToSet: { processedProviderPaymentIds: payment.id }
        }
      );
    }

    if (updateResult.modifiedCount === 0) {
      const alreadyProcessed = await Wallet.exists({
        _id: wallet._id,
        processedProviderPaymentIds: payment.id
      });
      if (!alreadyProcessed) throw new Error('Could not apply captured payment to wallet.');
    }

    const completedTransaction = await WalletTransaction.findByIdAndUpdate(
      transaction._id,
      {
        $set: {
          status: TRANSACTION_STATUS.COMPLETED,
          providerPaymentId: payment.id,
          description: transaction.groupId
            ? 'Razorpay test payment added to group wallet'
            : 'Razorpay test payment added to personal wallet'
        }
      },
      { new: true }
    );
    const updatedWallet = await Wallet.findById(wallet._id);

    if (transaction.groupId) {
      emitToGroup(transaction.groupId.toString(), 'wallet_updated', {
        groupId: transaction.groupId,
        totalBalance: updatedWallet.totalBalance,
        userId: transaction.userId,
        amountAdded: transaction.amount,
        transaction: completedTransaction
      });
    } else {
      emitToUser(transaction.userId.toString(), 'wallet_updated', {
        balance: updatedWallet.totalBalance,
        totalBalance: updatedWallet.totalBalance,
        transaction: completedTransaction
      });
    }

    return { wallet: updatedWallet, transaction: completedTransaction };
  }

  static async settleQrPayment(transaction, payment) {
    if (!transaction || !payment?.id || payment.status !== 'captured') return null;
    if (payment.amount !== Math.round(transaction.amount * 100) || payment.currency !== 'INR') throw new Error('Captured QR payment does not match the stored transaction.');
    const wallet = await Wallet.findById(transaction.walletId);
    if (!wallet) throw new Error('Wallet for captured payment was not found.');
    if (transaction.providerPaymentId && transaction.providerPaymentId !== payment.id) return null;
    let result;
    if (transaction.groupId) {
      await Wallet.updateOne({ _id: wallet._id, 'contributions.userId': { $ne: transaction.userId } }, { $push: { contributions: { userId: transaction.userId, amount: 0 } } });
      result = await Wallet.updateOne(
        { _id: wallet._id, processedProviderPaymentIds: { $ne: payment.id }, 'contributions.userId': transaction.userId },
        { $inc: { totalBalance: transaction.amount, 'contributions.$[contribution].amount': transaction.amount }, $addToSet: { processedProviderPaymentIds: payment.id } },
        { arrayFilters: [{ 'contribution.userId': transaction.userId }] }
      );
    } else {
      result = await Wallet.updateOne({ _id: wallet._id, processedProviderPaymentIds: { $ne: payment.id } }, { $inc: { totalBalance: transaction.amount }, $addToSet: { processedProviderPaymentIds: payment.id } });
    }
    if (result.modifiedCount === 0 && !(await Wallet.exists({ _id: wallet._id, processedProviderPaymentIds: payment.id }))) return null;
    const completedTransaction = await WalletTransaction.findOneAndUpdate(
      { _id: transaction._id, status: { $ne: TRANSACTION_STATUS.COMPLETED } },
      { $set: { status: TRANSACTION_STATUS.COMPLETED, providerPaymentId: payment.id, description: transaction.groupId ? 'Razorpay QR payment added to group wallet' : 'Razorpay QR payment added to personal wallet' } },
      { new: true }
    );
    if (!completedTransaction) return { transaction: await WalletTransaction.findById(transaction._id), wallet: await Wallet.findById(wallet._id) };
    const updatedWallet = await Wallet.findById(wallet._id);
    if (transaction.groupId) emitToGroup(transaction.groupId.toString(), 'wallet_updated', { groupId: transaction.groupId, totalBalance: updatedWallet.totalBalance, userId: transaction.userId, amountAdded: transaction.amount, transaction: completedTransaction });
    else emitToUser(transaction.userId.toString(), 'wallet_updated', { balance: updatedWallet.totalBalance, totalBalance: updatedWallet.totalBalance, transaction: completedTransaction });
    return { wallet: updatedWallet, transaction: completedTransaction };
  }

  static async markPaymentFailed(payment) {
    if (!payment?.order_id) return;
    await WalletTransaction.updateOne(
      {
        provider: 'razorpay',
        providerOrderId: payment.order_id,
        status: TRANSACTION_STATUS.PENDING
      },
      {
        $set: {
          status: TRANSACTION_STATUS.FAILED,
          description: 'Razorpay test payment failed'
        }
      }
    );
  }
}

module.exports = PaymentService;
