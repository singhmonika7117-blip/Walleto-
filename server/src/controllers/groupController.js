const Group = require('../models/Group');
const GroupMembership = require('../models/GroupMembership');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const ExpenseApproval = require('../models/ExpenseApproval');
const Expense = require('../models/Expense');
const generateCode = require('../utils/generateCode');
const { GROUP_ROLES, TRANSACTION_TYPES, TRANSACTION_STATUS } = require('../config/constants');
const { emitToGroup } = require('../services/socketService');

const createGroup = async (req, res, next) => {
  try {
    const { name, description, currency = 'INR', category = 'friends' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    let inviteCode;
    do {
      inviteCode = generateCode('SPLT', 4);
    } while (await Group.exists({ inviteCode }));

    const group = await Group.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      currency,
      category,
      inviteCode,
      createdBy: req.user._id
    });

    await GroupMembership.create({
      groupId: group._id,
      userId: req.user._id,
      role: GROUP_ROLES.CREATOR,
      status: 'active'
    });

    const wallet = await Wallet.create({
      groupId: group._id,
      totalBalance: 0,
      currency,
      contributions: [{ userId: req.user._id, amount: 0 }]
    });

    return res.status(201).json({
      success: true,
      message: 'Group created successfully',
      group,
      wallet
    });
  } catch (error) {
    return next(error);
  }
};

const previewGroupByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Invite code is required' });
    }

    const group = await Group.findOne({ inviteCode: code.trim().toUpperCase() })
      .populate('createdBy', 'name email');
    if (!group) {
      return res.status(404).json({ success: false, message: 'Invalid or non-existent invitation code' });
    }

    const [memberCount, isMember] = await Promise.all([
      GroupMembership.countDocuments({ groupId: group._id, status: 'active' }),
      GroupMembership.exists({ groupId: group._id, userId: req.user._id, status: 'active' })
    ]);

    return res.status(200).json({
      success: true,
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        inviteCode: group.inviteCode,
        category: group.category,
        currency: group.currency,
        creatorName: group.createdBy?.name || 'Group Member',
        memberCount,
        isAlreadyMember: Boolean(isMember),
        createdAt: group.createdAt
      }
    });
  } catch (error) {
    return next(error);
  }
};

const joinGroup = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ success: false, message: 'Invite code is required' });
    }

    const group = await Group.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found with this code' });
    }

    let membership = await GroupMembership.findOne({ groupId: group._id, userId: req.user._id });
    if (membership?.status === 'active') {
      return res.status(400).json({ success: false, message: 'You are already an active member of this group' });
    }
    if (membership) {
      membership.status = 'active';
      await membership.save();
    } else {
      membership = await GroupMembership.create({
        groupId: group._id,
        userId: req.user._id,
        role: GROUP_ROLES.MEMBER,
        status: 'active'
      });
    }

    const wallet = await Wallet.findOne({ groupId: group._id });
    if (wallet) {
      const hasContribution = wallet.contributions.some(
        (contribution) => contribution.userId.toString() === req.user._id.toString()
      );
      if (!hasContribution) {
        wallet.contributions.push({ userId: req.user._id, amount: 0 });
        await wallet.save();
      }
    }

    emitToGroup(group._id.toString(), 'member_joined', {
      groupId: group._id,
      user: { _id: req.user._id, name: req.user.name, email: req.user.email }
    });

    return res.status(200).json({ success: true, message: `Welcome to ${group.name}!`, group });
  } catch (error) {
    return next(error);
  }
};

const getUserGroups = async (req, res, next) => {
  try {
    const memberships = await GroupMembership.find({
      userId: req.user._id,
      status: 'active'
    }).populate('groupId');

    const groups = await Promise.all(
      memberships.filter((membership) => membership.groupId).map(async (membership) => {
        const group = membership.groupId;
        const [memberCount, activeApprovalsCount, wallet] = await Promise.all([
          GroupMembership.countDocuments({ groupId: group._id, status: 'active' }),
          ExpenseApproval.countDocuments({ groupId: group._id, status: 'VOTING' }),
          Wallet.findOne({ groupId: group._id })
        ]);

        const contribution = wallet?.contributions.find(
          (entry) => entry.userId.toString() === req.user._id.toString()
        );

        return {
          _id: group._id,
          name: group.name,
          description: group.description,
          inviteCode: group.inviteCode,
          currency: group.currency,
          category: group.category,
          role: membership.role,
          memberCount,
          activeApprovalsCount,
          totalWalletBalance: wallet?.totalBalance || 0,
          myContribution: contribution?.amount || 0,
          createdAt: group.createdAt
        };
      })
    );

    return res.status(200).json({ success: true, groups });
  } catch (error) {
    return next(error);
  }
};

const getGroupDetails = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).populate('createdBy', 'name email avatar');
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const memberships = await GroupMembership.find({
      groupId: group._id,
      status: 'active'
    }).populate('userId', 'name email avatar defaultCurrency');

    let wallet = await Wallet.findOne({ groupId: group._id })
      .populate('contributions.userId', 'name email avatar');
    if (!wallet) {
      wallet = await Wallet.create({
        groupId: group._id,
        totalBalance: 0,
        currency: group.currency,
        contributions: memberships.map((membership) => ({
          userId: membership.userId._id,
          amount: 0
        }))
      });
    }

    const members = memberships.map((membership) => {
      const contribution = wallet.contributions.find(
        (entry) => (entry.userId?._id || entry.userId)?.toString() === membership.userId._id.toString()
      );
      return {
        _id: membership.userId._id,
        name: membership.userId.name,
        email: membership.userId.email,
        avatar: membership.userId.avatar,
        role: membership.role,
        contributedBalance: contribution?.amount || 0,
        joinedAt: membership.joinedAt
      };
    });

    const [expenseApprovals, transactions] = await Promise.all([
      ExpenseApproval.find({ groupId: group._id })
        .populate('createdBy', 'name email avatar')
        .populate('votes.userId', 'name email avatar')
        .populate('approvedParticipants', 'name email avatar')
        .populate('rejectedParticipants', 'name email avatar')
        .sort({ createdAt: -1 }),
      WalletTransaction.find({ groupId: group._id })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(30)
    ]);

    const myContribution =
      members.find((member) => member._id.toString() === req.user._id.toString())?.contributedBalance || 0;

    return res.status(200).json({
      success: true,
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        inviteCode: group.inviteCode,
        currency: group.currency,
        category: group.category,
        createdBy: group.createdBy,
        createdAt: group.createdAt
      },
      wallet: {
        _id: wallet._id,
        totalBalance: wallet.totalBalance,
        currency: wallet.currency,
        myContribution
      },
      members,
      expenseApprovals,
      transactions
    });
  } catch (error) {
    return next(error);
  }
};

const addFundsToGroupWallet = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Direct simulated deposits are disabled. Start a verified checkout from the app instead.'
  });
};

const leaveGroup = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const membership = await GroupMembership.findOne({
      groupId,
      userId: req.user._id,
      status: 'active'
    });
    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership not found' });
    }

    if (membership.role === GROUP_ROLES.CREATOR) {
      const activeMembersCount = await GroupMembership.countDocuments({ groupId, status: 'active' });
      if (activeMembersCount > 1) {
        return res.status(400).json({
          success: false,
          message: 'As the group CREATOR, please appoint another member before leaving, or delete the group.'
        });
      }
    }

    membership.status = 'inactive';
    await membership.save();
    emitToGroup(groupId.toString(), 'member_left', { groupId, userId: req.user._id });

    return res.status(200).json({ success: true, message: 'You have left the group' });
  } catch (error) {
    return next(error);
  }
};

const getSimplifiedDebts = async (req, res) => {
  try {
    const { groupId } = req.params;
    const [expenses, members] = await Promise.all([
      Expense.find({ group: groupId }),
      GroupMembership.find({ groupId, status: 'active' })
    ]);

    const balances = {};
    members.forEach((membership) => {
      balances[membership.userId.toString()] = 0;
    });

    expenses.forEach((expense) => {
      const payerId = expense.paidBy.toString();
      balances[payerId] = (balances[payerId] || 0) + expense.split.reduce((sum, part) => sum + part.amount, 0);
      expense.split.forEach((part) => {
        const userId = part.userId.toString();
        balances[userId] = (balances[userId] || 0) - part.amount;
      });
    });

    const debtors = [];
    const creditors = [];
    Object.entries(balances).forEach(([userId, amount]) => {
      const rounded = Math.round(amount * 100) / 100;
      if (rounded < -0.01) debtors.push({ userId, amount: -rounded });
      else if (rounded > 0.01) creditors.push({ userId, amount: rounded });
    });
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const simplified = [];
    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const settlement = Math.min(debtor.amount, creditor.amount);
      simplified.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Number(settlement.toFixed(2))
      });
      debtor.amount -= settlement;
      creditor.amount -= settlement;
      if (debtor.amount < 0.01) debtorIndex++;
      if (creditor.amount < 0.01) creditorIndex++;
    }

    return res.status(200).json({ success: true, data: simplified });
  } catch (error) {
    console.error('Error in getSimplifiedDebts:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  createGroup,
  previewGroupByCode,
  joinGroup,
  getUserGroups,
  getGroupDetails,
  addFundsToGroupWallet,
  leaveGroup,
  getSimplifiedDebts
};
