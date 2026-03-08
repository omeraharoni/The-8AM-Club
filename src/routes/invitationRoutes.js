const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const { authenticateToken } = require('../middleware/auth');

router.post('/invitations', authenticateToken, invitationController.sendInvitation);
router.get('/invitations', authenticateToken, invitationController.getInvitations);
router.post('/invitations/:id/respond', authenticateToken, invitationController.respondToInvitation);

module.exports = router;
