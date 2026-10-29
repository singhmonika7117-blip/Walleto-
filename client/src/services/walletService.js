import api from './api';

export const walletService = {
  getWallet: async () => (await api.get('/wallet')).data,
  createDepositOrder: async (amount, groupId) =>
    (await api.post('/wallet/deposit/order', { amount, ...(groupId ? { groupId } : {}) })).data,
  createDepositQr: async (amount, groupId) =>
    (await api.post('/wallet/deposit/qr', { amount, ...(groupId ? { groupId } : {}) })).data,
  checkDepositQr: async (qrCodeId) => (await api.get(`/wallet/deposit/qr/${encodeURIComponent(qrCodeId)}`)).data,
  verifyDeposit: async (payment) => (await api.post('/wallet/deposit/verify', payment)).data,
  withdrawFunds: async (amount, bankDetails) => (await api.post('/wallet/withdraw', { amount, bankDetails })).data,
  getTransactions: async () => (await api.get('/wallet/transactions')).data
};
