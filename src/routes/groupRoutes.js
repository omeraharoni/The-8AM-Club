const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticateToken } = require('../middleware/auth');

router.get('/groups/info/:joinCode', groupController.getGroupInfo);
router.post('/groups', authenticateToken, groupController.createGroup);
router.get('/groups', authenticateToken, groupController.getGroups);
router.get('/groups/requests/pending', authenticateToken, groupController.getPendingRequests);
router.get('/groups/:groupId/leaderboard', authenticateToken, groupController.getLeaderboard);
router.post('/groups/join/:joinCode', authenticateToken, groupController.joinGroupByCode);
router.post('/groups/:groupId/sync', authenticateToken, groupController.syncMembership);
router.put('/groups/:groupId', authenticateToken, groupController.updateGroup);
router.delete('/groups/:groupId/members/:userId', authenticateToken, groupController.removeMember);
router.delete('/groups/:groupId', authenticateToken, groupController.deleteGroup);
router.post('/groups/:groupId/leave', authenticateToken, groupController.leaveGroup);

module.exports = router;
