/**
 * Application Constants & Enums for Walleto
 */
const GROUP_ROLES = {
  CREATOR: 'CREATOR',
  MEMBER: 'MEMBER'
};

const APPROVAL_STATUS = {
  VOTING: 'VOTING',
  EXECUTED: 'EXECUTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};

const VOTE_OPTIONS = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT'
};

const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  EXPENSE_DEDUCTION: 'expense_deduction',
  REFUND: 'refund',
  SETTLEMENT_TRANSFER: 'settlement_transfer'
};

const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

const NOTIFICATION_TYPES = {
  EXPENSE_REQUESTED: 'EXPENSE_REQUESTED',
  VOTE_CAST: 'VOTE_CAST',
  EXPENSE_EXECUTED: 'EXPENSE_EXECUTED',
  EXPENSE_REJECTED: 'EXPENSE_REJECTED',
  WALLET_FUNDED: 'WALLET_FUNDED',
  WALLET_INSUFFICIENT: 'WALLET_INSUFFICIENT',
  MEMBER_JOINED: 'MEMBER_JOINED'
};

const SPLIT_TYPES = {
  EQUAL: 'EQUAL',
  EXACT: 'EXACT',
  PERCENTAGE: 'PERCENTAGE',
  SHARES: 'SHARES'
};

const EXPENSE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const EXPENSE_CATEGORIES = [
  'food',
  'transport',
  'utilities',
  'entertainment',
  'shopping',
  'travel',
  'health',
  'other'
];

module.exports = {
  GROUP_ROLES,
  APPROVAL_STATUS,
  VOTE_OPTIONS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  NOTIFICATION_TYPES,
  EXPENSE_CATEGORIES,
  SPLIT_TYPES,
  EXPENSE_STATUS
};
