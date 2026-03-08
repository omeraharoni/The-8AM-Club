const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

router.put('/user/profile', authenticateToken, userController.updateProfile);
router.get('/user/progress', authenticateToken, userController.getProgress);

module.exports = router;
