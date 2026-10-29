import api from './api';

export const groupService = {
  getUserGroups: async () => {
    const res = await api.get('/groups');
    return res.data;
  },

  getGroupDetails: async (groupId) => {
    const res = await api.get(`/groups/${groupId}`);
    return res.data;
  },

  createGroup: async (groupData) => {
    const res = await api.post('/groups', groupData);
    return res.data;
  },

  previewGroup: async (inviteCode) => {
    const res = await api.get(`/groups/preview/${inviteCode}`);
    return res.data;
  },

  joinGroup: async (inviteCode) => {
    const res = await api.post('/groups/join', { inviteCode });
    return res.data;
  },


  leaveGroup: async (groupId) => {
    const res = await api.post(`/groups/${groupId}/leave`);
    return res.data;
  }
};
