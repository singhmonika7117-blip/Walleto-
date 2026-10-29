const express = require('express');
const router = express.Router();
const {
  createGroup,
  previewGroupByCode,
  joinGroup,
  getUserGroups,
  getGroupDetails,
  addFundsToGroupWallet,
  leaveGroup
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');
const { verifyGroupMembership } = require('../middleware/groupMiddleware');

router.use(protect);

router.route('/')
  .post(createGroup)
  .get(getUserGroups);

router.get('/preview/:code', previewGroupByCode);
router.post('/join', joinGroup);

router.route('/:id')
  .get(verifyGroupMembership, getGroupDetails);

router.post('/:id/wallet/deposit', verifyGroupMembership, addFundsToGroupWallet);
router.post('/:id/leave', verifyGroupMembership, leaveGroup);

module.exports = router;
