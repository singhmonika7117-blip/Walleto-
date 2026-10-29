import React, { createContext, useState, useCallback } from 'react';
import { groupService } from '../services/groupService';

export const GroupContext = createContext();

export const GroupProvider = ({ children }) => {
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await groupService.getUserGroups();
      setGroups(data.groups || []);
      return data.groups;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load groups');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGroupDetails = useCallback(async (groupId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await groupService.getGroupDetails(groupId);
      setCurrentGroup(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load group details');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createNewGroup = async (groupData) => {
    const data = await groupService.createGroup(groupData);
    await fetchGroups();
    return data.group;
  };

  const joinExistingGroup = async (inviteCode) => {
    const data = await groupService.joinGroup(inviteCode);
    await fetchGroups();
    return data.group;
  };

  return (
    <GroupContext.Provider
      value={{
        groups,
        currentGroup,
        loading,
        error,
        fetchGroups,
        fetchGroupDetails,
        createNewGroup,
        joinExistingGroup,
        setCurrentGroup
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};
