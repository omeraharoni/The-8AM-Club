const Group = require('../models/Group');
const Membership = require('../models/Membership');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { calculateStats } = require('../services/statsService');
const crypto = require('crypto');
const mongoose = require('mongoose');

function generateJoinCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

exports.createGroup = async (req, res) => {
    try {
        const { name, description, category, imageUrl, wakeupTimeTarget, weeklyWakeupTarget, weeklyWorkoutTarget } = req.body;
        const joinCode = generateJoinCode();
        
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const newGroup = new Group({ 
            name, 
            description, 
            category, 
            imageUrl,
            joinCode,
            ownerId: userId,
            wakeupTimeTarget: wakeupTimeTarget || '08:00',
            weeklyWakeupTarget: weeklyWakeupTarget || 5,
            weeklyWorkoutTarget: weeklyWorkoutTarget || 4
        });
        
        await newGroup.save();
        const membership = new Membership({ groupId: newGroup._id, userId: userId, role: 'owner' });
        await membership.save();
        res.status(201).json(newGroup);
    } catch (err) {
        console.error('Create Group Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getGroups = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            console.error('[GET_GROUPS] No user ID in request');
            return res.status(401).json({ message: 'Unauthorized: No user ID found' });
        }
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const memberships = await Membership.find({ userId: userId }).populate('groupId');
        
        // Filter out any memberships where the group might have been deleted
        const myGroups = [];

        for (const m of memberships) {
            try {
                if (!m.groupId || typeof m.groupId === 'string' || !m.groupId.save) {
                    console.warn(`[GET_GROUPS] Invalid or unpopulated groupId for membership ${m._id}`);
                    continue;
                }
                
                let group = m.groupId;
                let changed = false;

                // --- SELF-HEALING: Ensure joinCode and ownerId ---
                if (!group.joinCode) {
                    group.joinCode = generateJoinCode();
                    changed = true;
                }
                
                if (!group.ownerId) {
                    // If this membership is marked as owner, set group owner
                    if (m.role === 'owner') {
                        group.ownerId = userId;
                        changed = true;
                    } else {
                        // Look for any owner membership in this group
                        const anyOwner = await Membership.findOne({ groupId: group._id, role: 'owner' });
                        if (anyOwner) {
                            group.ownerId = anyOwner.userId;
                            changed = true;
                        } else {
                            // No owner found at all? Make the first person (usually the creator) the owner
                            group.ownerId = userId;
                            m.role = 'owner'; // Upgrade current user to owner
                            await m.save();
                            changed = true;
                        }
                    }
                }

                if (changed) await group.save();
                
                // Determine display role
                let displayRole = m.role;
                if (group.ownerId && userId && group.ownerId.toString() === userId.toString()) {
                    displayRole = 'owner';
                }

                // Construct a clean object for the frontend
                myGroups.push({
                    id: group._id.toString(),
                    _id: group._id.toString(),
                    name: group.name,
                    description: group.description,
                    category: group.category,
                    imageUrl: group.imageUrl,
                    joinCode: group.joinCode || 'NOCODE',
                    ownerId: group.ownerId ? group.ownerId.toString() : null,
                    userRole: displayRole,
                    weeklyWakeupTarget: group.weeklyWakeupTarget || 5,
                    weeklyWorkoutTarget: group.weeklyWorkoutTarget || 4
                });
            } catch (err) {
                console.error(`[GET_GROUPS] Error processing group ${m.groupId}:`, err.message);
                // Continue to next group instead of failing entire request
            }
        }

        res.json(myGroups);
    } catch (err) {
        console.error('--- GET GROUPS ERROR ---');
        console.error('User ID:', req.user?.id);
        console.error('Stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const groupId = req.params.groupId;
        console.log('Fetching leaderboard for group:', groupId);

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            console.error('Invalid Group ID format:', groupId);
            return res.status(400).json({ message: 'Invalid Group ID' });
        }

        const members = await Membership.find({ groupId: new mongoose.Types.ObjectId(groupId) }).populate('userId');
        console.log(`[DEBUG] Found ${members.length} members for group ${groupId}`);
        
        const leaderboardData = await Promise.all(members.map(async (m) => {
            if (!m.userId) return null;
            const stats = await calculateStats(m.userId._id, groupId);
            
            // Get user's LATEST story from TODAY for the "Story Ring"
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            const latestProof = await Activity.findOne({
                userId: m.userId._id,
                proofImage: { $exists: true, $ne: null, $ne: "" },
                $expr: { $gt: [{ $strLenCP: { $ifNull: ["$proofImage", ""] } }, 100] },
                timestamp: { $gte: startOfToday }
            }).sort({ timestamp: -1 });

            return {
                userId: m.userId._id,
                username: m.userId.username,
                profilePic: m.userId.profilePic,
                weeklyPoints: stats.points,
                workouts: stats.workouts,
                onTimeRises: stats.onTimeRises,
                avgSleep: stats.avgSleep,
                avgSteps: stats.avgSteps,
                latestStory: latestProof ? {
                    image: latestProof.proofImage,
                    type: latestProof.type,
                    isSolo: latestProof.isSolo,
                    timestamp: latestProof.timestamp
                } : null
            };
        }));

        // Fetch ALL stories from TODAY for the group feed
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const allMemberIds = members.filter(m => m.userId).map(m => m.userId._id);
        
        // Fetch every activity with a photo from today, sorted by time (oldest first for "story" flow)
        // Ensure proofImage has actual data length
        const groupStories = await Activity.find({
            userId: { $in: allMemberIds },
            proofImage: { $exists: true, $ne: null, $ne: "" },
            $expr: { $gt: [{ $strLenCP: { $ifNull: ["$proofImage", ""] } }, 100] },
            timestamp: { $gte: startOfToday }
        }).sort({ timestamp: 1 }); // Oldest first: Morning -> Evening flow

        // Create a map of userId -> profilePic for efficient lookup
        const userPicMap = {};
        members.forEach(m => {
            if (m.userId) {
                userPicMap[m.userId._id.toString()] = m.userId.profilePic;
            }
        });

        const filteredLeaderboard = leaderboardData.filter(item => item !== null);

        // --- HIGHLIGHTS LOGIC ---
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfToday.getDate() - 1);

        const earlyBird = await Activity.findOne({
            userId: { $in: allMemberIds },
            type: 'wakeup',
            timestamp: { $gte: startOfToday }
        }).sort({ timestamp: 1 }).populate('userId', 'username profilePic');

        const topPerformer = filteredLeaderboard.length > 0 ? filteredLeaderboard[0] : null;

        const yesterdayStories = await Activity.find({
            userId: { $in: allMemberIds },
            proofImage: { $exists: true, $ne: null, $ne: "" },
            timestamp: { $gte: startOfYesterday, $lt: startOfToday }
        }).sort({ timestamp: -1 }).limit(5);

        res.json({
            memberCount: filteredLeaderboard.length,
            leaderboard: filteredLeaderboard.sort((a, b) => b.weeklyPoints - a.weeklyPoints),
            stories: groupStories.map(s => ({
                id: s._id,
                userId: s.userId,
                username: s.username,
                profilePic: userPicMap[s.userId.toString()],
                image: s.proofImage,
                type: s.type,
                isSolo: s.isSolo,
                timestamp: s.timestamp,
                note: s.note
            })),
            highlights: {
                earlyBird: earlyBird ? {
                    username: earlyBird.userId.username,
                    profilePic: earlyBird.userId.profilePic,
                    time: earlyBird.timestamp
                } : null,
                topPerformer: topPerformer ? {
                    username: topPerformer.username,
                    profilePic: topPerformer.profilePic,
                    points: topPerformer.weeklyPoints
                } : null
            },
            yesterdayRecap: yesterdayStories.map(s => ({
                username: s.username,
                profilePic: userPicMap[s.userId.toString()],
                image: s.proofImage,
                type: s.type
            }))
        });
    } catch (err) {
        console.error('Leaderboard Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const Invitation = require('../models/Invitation');

exports.joinGroupByCode = async (req, res) => {
    try {
        const { joinCode } = req.params;
        console.log('User attempting to join by code:', joinCode);
        
        const group = await Group.findOne({ joinCode: joinCode.toUpperCase() });
        if (!group) {
            console.error('Group not found for code:', joinCode);
            return res.status(404).json({ message: 'Group not found' });
        }

        const userId = new mongoose.Types.ObjectId(req.user.id);

        // Check if already a member
        const existingMember = await Membership.findOne({ groupId: group._id, userId });
        if (existingMember) return res.status(400).json({ message: 'Already a member' });

        // Check if request already pending
        const existingRequest = await Invitation.findOne({ 
            groupId: group._id, 
            fromUserId: userId, 
            type: 'request',
            status: 'pending' 
        });
        if (existingRequest) return res.status(400).json({ message: 'Join request already pending' });

        const newRequest = new Invitation({
            groupId: new mongoose.Types.ObjectId(group._id),
            groupName: group.name,
            fromUserId: userId,
            fromUsername: req.user.username,
            toUserId: new mongoose.Types.ObjectId(group.ownerId),
            type: 'request',
            status: 'pending'
        });

        await newRequest.save();
        console.log('Join request saved successfully. toUserId (manager):', group.ownerId);
        res.status(201).json({ message: 'Join request sent to manager' });
    } catch (err) {
        console.error('Join By Code Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getPendingRequests = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            console.error('[GET_PENDING_REQUESTS] No user ID in request');
            return res.status(401).json({ message: 'Unauthorized: No user ID found' });
        }
        const userId = req.user.id;
        
        // Find all groups owned by this user
        const myGroups = await Group.find({ 
            $or: [
                { ownerId: userId },
                { ownerId: new mongoose.Types.ObjectId(userId) }
            ]
        });
        const groupIds = myGroups.map(g => g._id);

        // Find requests for these groups
        const requests = await Invitation.find({ 
            groupId: { $in: groupIds },
            type: 'request', 
            status: 'pending' 
        });
        
        res.json(requests);
    } catch (err) {
        console.error('--- GET REQUESTS ERROR ---');
        console.error('User ID:', req.user?.id);
        console.error('Stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getGroupInfo = async (req, res) => {
    try {
        const { joinCode } = req.params;
        const group = await Group.findOne({ joinCode }).select('name category description ownerId');
        if (!group) return res.status(404).json({ message: 'Group not found' });
        
        const owner = await User.findById(group.ownerId).select('username');
        
        res.json({
            name: group.name,
            category: group.category,
            description: group.description,
            ownerName: owner ? owner.username : 'Unknown'
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.syncMembership = async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const userId = new mongoose.Types.ObjectId(req.user.id);
        
        // Ensure the requester is the owner
        if (group.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Only the owner can sync membership' });
        }

        const existing = await Membership.findOne({ groupId: group._id, userId });
        if (!existing) {
            const membership = new Membership({ groupId: group._id, userId, role: 'owner' });
            await membership.save();
            return res.json({ message: 'Owner membership restored' });
        }

        res.json({ message: 'Membership already in sync' });
    } catch (err) {
        console.error('Sync Membership Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description, category, weeklyWakeupTarget, weeklyWorkoutTarget } = req.body;
        
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (group.ownerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Only the owner can edit the group' });
        }

        group.name = name || group.name;
        group.description = description || group.description;
        group.category = category || group.category;
        if (wakeupTimeTarget !== undefined) group.wakeupTimeTarget = wakeupTimeTarget;
        if (weeklyWakeupTarget !== undefined) group.weeklyWakeupTarget = weeklyWakeupTarget;
        if (weeklyWorkoutTarget !== undefined) group.weeklyWorkoutTarget = weeklyWorkoutTarget;

        await group.save();
        res.json(group);
    } catch (err) {
        console.error('Update Group Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (group.ownerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Only the owner can delete the group' });
        }

        // Delete all related memberships and invitations
        await Membership.deleteMany({ groupId });
        await Invitation.deleteMany({ groupId });
        await Group.findByIdAndDelete(groupId);

        res.json({ message: 'Group deleted successfully' });
    } catch (err) {
        console.error('Delete Group Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        // Owners cannot leave using this endpoint (they should delete or transfer)
        if (group.ownerId.toString() === userId.toString()) {
            return res.status(400).json({ message: 'Owners cannot leave. Please delete the group instead.' });
        }

        const result = await Membership.deleteOne({ groupId, userId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Membership not found' });
        }

        res.json({ message: 'You have left the group' });
    } catch (err) {
        console.error('Leave Group Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.removeMember = async (req, res) => {
    try {
        const { groupId, userId: targetUserId } = req.params;
        const ownerId = req.user.id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        // Ensure requester is owner
        if (group.ownerId.toString() !== ownerId.toString()) {
            return res.status(403).json({ message: 'Only owners can remove members' });
        }

        const targetUid = new mongoose.Types.ObjectId(targetUserId);
        const groupUid = new mongoose.Types.ObjectId(groupId);

        // Cannot remove yourself (the owner)
        if (targetUserId.toString() === ownerId.toString()) {
            return res.status(400).json({ message: 'Owners cannot be removed. Delete the group instead.' });
        }

        const result = await Membership.deleteOne({ groupId: groupUid, userId: targetUid });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Membership not found' });
        }

        res.json({ message: 'Member removed successfully' });
    } catch (err) {
        console.error('Remove Member Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
