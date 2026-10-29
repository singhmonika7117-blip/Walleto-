const express = require('express');
const router = express.Router();
const {
  createExpense,
  getGroupExpenses,
  getExpenseById,
  deleteExpense
} = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');
const { verifyGroupMembership } = require('../middleware/groupMiddleware');

router.use(protect);

router.post('/', createExpense);
router.get('/group/:groupId', verifyGroupMembership, getGroupExpenses);
router.get('/:id', getExpenseById);
router.delete('/:id', deleteExpense);

module.exports = router;
