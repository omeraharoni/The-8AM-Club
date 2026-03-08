const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticateToken } = require('../middleware/auth');

router.post('/activity/activity', authenticateToken, activityController.logActivity);
router.get('/activity/me', authenticateToken, activityController.getMe);

module.exports = router;
