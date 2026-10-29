const express = require('express');
const router = express.Router();
const {
  getWallet,
  createDepositOrder,
  createDepositQr,
  checkDepositQr,
  verifyDeposit,
  withdrawFunds,
  getTransactionHistory
} = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getWallet);
router.post('/deposit/order', createDepositOrder);
router.post('/deposit/qr', createDepositQr);
router.get('/deposit/qr/:qrCodeId', checkDepositQr);
router.post('/deposit/verify', verifyDeposit);
router.post('/withdraw', withdrawFunds);
router.get('/transactions', getTransactionHistory);

module.exports = router;
