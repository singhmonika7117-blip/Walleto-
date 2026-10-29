const express = require('express');
const router = express.Router();
const {
  createExpenseApproval,
  castVote,
  executeExpenseApproval,
  getPendingApprovals,
  getApprovalHistory,
  cancelApproval
} = require('../controllers/approvalController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createExpenseApproval);
router.get('/pending', getPendingApprovals);
router.get('/history', getApprovalHistory);
router.post('/:id/vote', castVote);
router.post('/:id/execute', executeExpenseApproval);
router.post('/:id/finalize', executeExpenseApproval);
router.post('/:id/cancel', cancelApproval);

module.exports = router;
