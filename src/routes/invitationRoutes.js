const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, invitationController.sendInvitation);
router.get('/', authenticateToken, invitationController.getInvitations);
router.post('/:id/respond', authenticateToken, invitationController.respondToInvitation);

module.exports = router;
