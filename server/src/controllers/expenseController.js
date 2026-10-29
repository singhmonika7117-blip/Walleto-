const Expense = require('../models/Expense');
const ExpenseApproval = require('../models/ExpenseApproval');
const Group = require('../models/Group');
const GroupMembership = require('../models/GroupMembership');
const Notification = require('../models/Notification');
const { calculateSplit } = require('../utils/calculateSplit');
const { SPLIT_TYPES, EXPENSE_STATUS, APPROVAL_STATUS, NOTIFICATION_TYPES } = require('../config/constants');
const { emitToGroup, emitToUser } = require('../services/socketService');

/**
 * @desc    Create a new expense with dynamic split calculation & approval initiation
 * @route   POST /api/expenses
 * @access  Private
 */
const createExpense = async (req, res, next) => {
  try {
    const {
      groupId,
      title,
      description,
      amount,
      category,
      splitType = SPLIT_TYPES.EQUAL,
      participants,
      receiptUrl,
      notes
    } = req.body;

    if (!groupId || !title || !amount) {
      return res.status(400).json({
        success: false,
        message: 'groupId, title, and amount are required'
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
    }

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // If no participants passed for EQUAL split, automatically use all active group members
    let effectiveParticipants = participants;
    if ((!participants || participants.length === 0) && splitType === SPLIT_TYPES.EQUAL) {
      const activeMembers = await GroupMembership.find({ groupId, status: 'active' });
      effectiveParticipants = activeMembers.map((m) => m.userId.toString());
    }

    // Calculate splits using our dynamic split math engine
    const splitCalculation = calculateSplit({
      totalAmount: numAmount,
      splitType,
      participants: effectiveParticipants
    });

    const payerId = req.user._id;

    // Build splits array for Expense document
    const formattedSplits = splitCalculation.splits.map((s) => ({
      user: s.user,
      amount: s.amount,
      percentage: s.percentage || 0,
      shares: s.shares || 1,
      // Payer automatically approves their own split
      status: s.user.toString() === payerId.toString() ? 'approved' : 'pending'
    }));

    // If only payer is involved (solo expense), auto approve
    const needsApproval = formattedSplits.some(
      (s) => s.user.toString() !== payerId.toString()
    );

    const expenseStatus = needsApproval
      ? EXPENSE_STATUS.PENDING_APPROVAL
      : EXPENSE_STATUS.APPROVED;

    const expense = await Expense.create({
      groupId,
      title,
      description: description || '',
      amount: numAmount,
      currency: group.currency || 'USD',
      paidBy: payerId,
      category: category || 'other',
      splitType,
      splits: formattedSplits,
      status: expenseStatus,
      receiptUrl: receiptUrl || '',
      notes: notes || ''
    });

    // Create approval requests for other members
    const approvalPromises = [];
    formattedSplits.forEach((split) => {
      if (split.user.toString() !== payerId.toString()) {
        approvalPromises.push(
          ExpenseApproval.create({
            expenseId: expense._id,
            userId: split.user,
            status: APPROVAL_STATUS.PENDING
          })
        );

        // Create notification for participant
        approvalPromises.push(
          Notification.create({
            recipient: split.user,
            sender: payerId,
            type: NOTIFICATION_TYPES.APPROVAL_REQUESTED,
            title: 'Expense Approval Required',
            message: `${req.user.name} added an expense "${title}" for $${numAmount}. Your share is $${split.amount}.`,
            data: {
              groupId,
              expenseId: expense._id
            }
          })
        );

        // Realtime socket alert to participant
        emitToUser(split.user.toString(), 'approval_requested', {
          expenseId: expense._id,
          title,
          amount: numAmount,
          userShare: split.amount,
          paidBy: { _id: payerId, name: req.user.name }
        });
      }
    });

    await Promise.all(approvalPromises);

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    // Notify group room
    emitToGroup(groupId.toString(), 'expense_created', populatedExpense);

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      expense: populatedExpense
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all expenses for a group
 * @route   GET /api/expenses/group/:groupId
 * @access  Private
 */
const getGroupExpenses = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const expenses = await Expense.find({ groupId })
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      expenses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single expense with approvals
 * @route   GET /api/expenses/:id
 * @access  Private
 */
const getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const approvals = await ExpenseApproval.find({ expenseId: expense._id })
      .populate('userId', 'name email avatar');

    res.status(200).json({
      success: true,
      expense,
      approvals
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an expense
 * @route   DELETE /api/expenses/:id
 * @access  Private
 */
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    // Only payer or group admin can delete
    if (expense.paidBy.toString() !== req.user._id.toString()) {
      const membership = await GroupMembership.findOne({
        groupId: expense.groupId,
        userId: req.user._id,
        role: 'admin'
      });
      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'Only the person who paid or a group admin can delete this expense'
        });
      }
    }

    await ExpenseApproval.deleteMany({ expenseId: expense._id });
    await expense.deleteOne();

    emitToGroup(expense.groupId.toString(), 'expense_deleted', {
      expenseId: expense._id
    });

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExpense,
  getGroupExpenses,
  getExpenseById,
  deleteExpense
};
