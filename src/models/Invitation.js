const mongoose = require('mongoose');

const InvitationSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    groupName: String,
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromUsername: String,
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['invite', 'request'], default: 'invite' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
});

module.exports = mongoose.model('Invitation', InvitationSchema);
