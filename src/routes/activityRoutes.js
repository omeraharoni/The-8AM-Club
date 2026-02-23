const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticateToken } = require('../middleware/auth');

router.post('/activity', authenticateToken, activityController.logActivity);
router.get('/me', authenticateToken, activityController.getMe);

module.exports = router;
