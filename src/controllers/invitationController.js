const Invitation = require('../models/Invitation');
const Group = require('../models/Group');
const User = require('../models/User');
const Membership = require('../models/Membership');

exports.sendInvitation = async (req, res) => {
    try {
        const { groupId, targetUsername } = req.body;
        const targetUser = await User.findOne({ username: targetUsername });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });
        
        const group = await Group.findById(groupId);
        const invitation = new Invitation({
            groupId,
            groupName: group.name,
            fromUserId: req.user.id,
            fromUsername: req.user.username,
            toUserId: targetUser._id
        });
        
        await invitation.save();
        res.status(201).json({ message: 'Invitation sent' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getInvitations = async (req, res) => {
    try {
        const myInvites = await Invitation.find({ toUserId: req.user.id, status: 'pending' });
        res.json(myInvites);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.respondToInvitation = async (req, res) => {
    try {
        const { accept } = req.body;
        const invite = await Invitation.findById(req.params.id);
        if (!invite) return res.status(404).json({ message: 'Not found' });
        
        if (accept) {
            const membership = new Membership({ groupId: invite.groupId, userId: req.user.id });
            await membership.save();
            invite.status = 'accepted';
        } else {
            invite.status = 'rejected';
        }
        await invite.save();
        res.json({ message: accept ? 'Joined group' : 'Rejected' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
