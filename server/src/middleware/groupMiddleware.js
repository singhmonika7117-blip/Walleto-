const GroupMembership = require('../models/GroupMembership');

/**
 * Middleware to verify that the logged-in user belongs to the requested group
 */
const verifyGroupMembership = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.params.id || req.body.groupId;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required to verify membership'
      });
    }

    const membership = await GroupMembership.findOne({
      groupId,
      userId: req.user._id,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not an active member of this group'
      });
    }

    req.groupMembership = membership;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to verify that the logged-in user is an admin of the requested group
 */
const verifyGroupAdmin = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.params.id || req.body.groupId;

    const membership = await GroupMembership.findOne({
      groupId,
      userId: req.user._id,
      status: 'active'
    });

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Group admin permissions required'
      });
    }

    req.groupMembership = membership;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyGroupMembership,
  verifyGroupAdmin
};
