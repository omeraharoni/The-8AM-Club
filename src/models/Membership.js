const mongoose = require('mongoose');

const MembershipSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, default: 'member' }
});

module.exports = mongoose.model('Membership', MembershipSchema);
