const mongoose = require('mongoose');

const InvitationSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    groupName: String,
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fromUsername: String,
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, default: 'pending' }
});

module.exports = mongoose.model('Invitation', InvitationSchema);
