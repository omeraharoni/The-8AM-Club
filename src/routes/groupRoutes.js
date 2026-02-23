const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, groupController.createGroup);
router.get('/', authenticateToken, groupController.getGroups);
router.get('/:groupId/leaderboard', authenticateToken, groupController.getLeaderboard);

module.exports = router;
