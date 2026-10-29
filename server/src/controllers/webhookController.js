const PaymentService = require('../services/paymentService');

const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!PaymentService.verifyWebhookSignature(req.body, signature)) {
      return res.status(400).json({ success: false, message: 'Invalid Razorpay webhook signature.' });
    }

    let payload;
    try {
      payload = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload.' });
    }

    const payment = payload.payload?.payment?.entity;
    if (payload.event === 'payment.captured' && payment) {
      await PaymentService.settleCapturedPayment(payment);
    } else if (payload.event === 'payment.failed' && payment) {
      await PaymentService.markPaymentFailed(payment);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = { handleRazorpayWebhook };