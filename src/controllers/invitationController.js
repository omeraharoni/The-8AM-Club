const Invitation = require('../models/Invitation');
const Group = require('../models/Group');
const User = require('../models/User');
const Membership = require('../models/Membership');
const mongoose = require('mongoose');

exports.sendInvitation = async (req, res) => {
    try {
        const { groupId, targetUsername } = req.body;
        // Case-insensitive username lookup
        const targetUser = await User.findOne({ username: { $regex: new RegExp(`^${targetUsername}$`, 'i') } });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });
        
        const group = await Group.findById(groupId);
        const invitation = new Invitation({
            groupId: new mongoose.Types.ObjectId(groupId),
            groupName: group.name,
            fromUserId: new mongoose.Types.ObjectId(req.user.id),
            fromUsername: req.user.username,
            toUserId: targetUser._id
        });
        
        await invitation.save();
        res.status(201).json({ message: 'Invitation sent' });
    } catch (err) {
        console.error('Send Invitation Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getInvitations = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const myInvites = await Invitation.find({ 
            toUserId: userId, 
            status: 'pending',
            type: 'invite' 
        });
        res.json(myInvites);
    } catch (err) {
        console.error('Get Invitations Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.respondToInvitation = async (req, res) => {
    try {
        const { accept } = req.body;
        console.log(`[INVITE] Respond to ${req.params.id} | Accept: ${accept} | User: ${req.user.username}`);
        
        const invite = await Invitation.findById(req.params.id);
        if (!invite) {
            console.error(`[INVITE] Invitation ${req.params.id} not found`);
            return res.status(404).json({ message: 'Not found' });
        }
        
        // Authorization check
        if (invite.toUserId.toString() !== req.user.id.toString()) {
            console.warn(`[INVITE] Unauthorized: ${req.user.id} trying to respond to ${invite.toUserId}`);
            return res.status(403).json({ message: 'Unauthorized' });
        }
        
        let message = accept ? 'Joined group' : 'Rejected';

        if (accept) {
            const joiningUserId = invite.type === 'request' ? invite.fromUserId : invite.toUserId;
            
            const existing = await Membership.findOne({ groupId: invite.groupId, userId: joiningUserId });
            if (!existing) {
                const membership = new Membership({ groupId: invite.groupId, userId: joiningUserId });
                await membership.save();
                console.log(`[INVITE] New membership created for ${joiningUserId} in group ${invite.groupId}`);
            } else {
                console.log(`[INVITE] User ${joiningUserId} is already a member of ${invite.groupId}`);
                message = 'User is already a member';
            }
            invite.status = 'accepted';
        } else {
            invite.status = 'rejected';
        }
        await invite.save();
        res.json({ message, groupId: invite.groupId });
    } catch (err) {
        console.error('Respond Invitation Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
