import api from './api';

export const notificationService = {
  createExpenseApproval: async (data) => {
    const res = await api.post('/approvals', data);
    return res.data;
  },

  castVote: async (approvalId, vote) => {
    const res = await api.post(`/approvals/${approvalId}/vote`, { vote });
    return res.data;
  },

  executeExpense: async (approvalId) => {
    const res = await api.post(`/approvals/${approvalId}/execute`);
    return res.data;
  },

  cancelApproval: async (approvalId) => {
    const res = await api.post(`/approvals/${approvalId}/cancel`);
    return res.data;
  },

  getPendingApprovals: async () => {
    const res = await api.get('/approvals/pending');
    return res.data;
  },

  getApprovalHistory: async () => {
    const res = await api.get('/approvals/history');
    return res.data;
  }
};
