const express = require('express');
const router = express.Router();
const { handleRazorpayWebhook } = require('../controllers/webhookController');

// Razorpay signs the exact request bytes; do not parse this body as JSON first.
router.post('/payment', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

module.exports = router;
