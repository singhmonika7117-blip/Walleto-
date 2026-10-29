import api from './api';

export const expenseService = {
  createExpense: async (expenseData) => {
    const res = await api.post('/expenses', expenseData);
    return res.data;
  },

  getGroupExpenses: async (groupId) => {
    const res = await api.get(`/expenses/group/${groupId}`);
    return res.data;
  },

  getExpenseById: async (expenseId) => {
    const res = await api.get(`/expenses/${expenseId}`);
    return res.data;
  },

  deleteExpense: async (expenseId) => {
    const res = await api.delete(`/expenses/${expenseId}`);
    return res.data;
  }
};
