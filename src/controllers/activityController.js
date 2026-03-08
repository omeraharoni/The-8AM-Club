const Activity = require('../models/Activity');
const User = require('../models/User');
const Group = require('../models/Group');
const Membership = require('../models/Membership');
const { calculateStats } = require('../services/statsService');

exports.logActivity = async (req, res) => {
    try {
        console.log('[DEBUG] Incoming Activity Data keys:', Object.keys(req.body));
        const { type, value, note, isShared, isSolo, proofImage } = req.body;
        const userId = req.user.id;
        const username = req.user.username;
        
        let pointsEarned = 0;
        const numValue = Number(value) || 0;
        
        // TTL for photos: Expires at the next midnight (reset every day)
        let expiresAt = null;
        if (proofImage) {
            expiresAt = new Date();
            expiresAt.setHours(23, 59, 59, 999); 
        }

        console.log(`[ACTIVITY_LOG] User: ${username}, Type: ${type}, Value: ${numValue}, Photo: ${!!proofImage}`);

        if (type === 'workout') {
            // WORKOUT LOGIC
            if (numValue >= 45) pointsEarned = 10;
            else if (numValue >= 15) pointsEarned = 5;
            
            if (isShared) pointsEarned += 1;
            if (proofImage) pointsEarned += 5; // BONUS FOR PROOF
            
            const activity = new Activity({
                userId,
                username,
                type,
                value: numValue,
                note: note || '',
                isShared: !!isShared,
                isSolo: isSolo !== undefined ? isSolo : true,
                points: pointsEarned,
                proofImage: proofImage || null,
                expiresAt
            });
            await activity.save();
            return res.status(201).json({ message: 'Workout logged', pointsEarned });

        } else if (type === 'steps') {
            // ... (keeping existing steps logic)
            // Re-assign to pointsEarned for safety
            const rawSteps = Number(value) || 0;
            const cappedSteps = Math.min(rawSteps, 15000);
            pointsEarned = Number(((cappedSteps / 1000.0) * 0.5).toFixed(2));
            
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            
            const existing = await Activity.findOne({
                userId,
                type: 'steps',
                timestamp: { $gte: startOfDay }
            });
            
            if (existing) {
                const oldPoints = Number(existing.points) || 0;
                const deltaPoints = Number((pointsEarned - oldPoints).toFixed(2));
                
                existing.value = rawSteps;
                existing.points = pointsEarned;
                existing.timestamp = new Date();
                await existing.save();
                
                return res.status(200).json({ 
                    message: 'Steps updated', 
                    pointsEarned: deltaPoints > 0 ? deltaPoints : 0 
                });
            } else {
                const activity = new Activity({
                    userId,
                    username,
                    type,
                    value: rawSteps,
                    points: pointsEarned,
                    timestamp: new Date()
                });
                await activity.save();
                return res.status(201).json({ message: 'Steps logged', pointsEarned });
            }
        } else if (type === 'sleep') {
            if (numValue >= 7) pointsEarned = 5;
            // REMOVED proof bonus from sleep type to prevent duplicates with wakeup
            
            const activity = new Activity({
                userId,
                username,
                type,
                value: numValue,
                note: note || '',
                points: pointsEarned,
                proofImage: null, // Always null for sleep
                expiresAt: null
            });
            await activity.save();
            return res.status(201).json({ message: 'Sleep logged', pointsEarned });
        } else if (type === 'wakeup') {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();
            
            // Default target is 08:00
            let targetHour = 8;
            let targetMin = 0;
            let hasAnyTarget = true;

            // Fetch user's groups to find the strictest wakeup target
            const memberships = await Membership.find({ userId });
            const groupIds = memberships.map(m => m.groupId);
            const groups = await Group.find({ _id: { $in: groupIds } });

            if (groups.length > 0) {
                let foundSpecificTarget = false;
                let allNone = true;
                let earliestH = 24;
                let earliestM = 60;

                groups.forEach(g => {
                    if (g.wakeupTimeTarget && g.wakeupTimeTarget !== 'none') {
                        allNone = false;
                        const [h, m] = g.wakeupTimeTarget.split(':').map(Number);
                        if (h < earliestH || (h === earliestH && m < earliestM)) {
                            earliestH = h;
                            earliestM = m;
                            foundSpecificTarget = true;
                        }
                    }
                });

                if (foundSpecificTarget) {
                    targetHour = earliestH;
                    targetMin = earliestM;
                } else if (allNone) {
                    hasAnyTarget = false;
                }
            }
// Award points if before target
if (hasAnyTarget && (currentHour < targetHour || (currentHour === targetHour && currentMin <= targetMin))) {
    pointsEarned = 5;
}

// NEW: Also award sleep duration points in wakeup log if duration is provided
if (numValue >= 7) {
    pointsEarned += 5;
}

if (proofImage) {
    pointsEarned += 5;
}
            const activity = new Activity({
                userId,
                username,
                type,
                value: numValue,
                note: note || '',
                isShared: !!isShared,
                points: pointsEarned,
                proofImage: proofImage || null,
                expiresAt
            });
            await activity.save();
            return res.status(201).json({ message: 'Wakeup logged', pointsEarned });
        }

        // Generic save for other types (wakeup, etc.)
        const activity = new Activity({
            userId,
            username,
            type,
            value: numValue,
            note: note || '',
            isShared: !!isShared,
            points: pointsEarned,
            proofImage: proofImage || null,
            expiresAt
        });
        
        await activity.save();
        res.status(201).json({ message: 'Activity logged', pointsEarned });

    } catch (err) {
        console.error('CRITICAL logActivity error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.applyPenalty = async (req, res) => {
    try {
        const { userId, groupId, amount, reason } = req.body;
        const adminId = req.user.id;

        // Verify the group exists
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        // Verify the requester is the group owner
        if (group.ownerId.toString() !== adminId.toString()) {
            return res.status(403).json({ message: 'Only group owners can apply penalties' });
        }

        // Verify the target user exists
        const targetUser = await User.findById(userId);
        if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

        // Create a penalty activity
        const penalty = new Activity({
            userId,
            username: targetUser.username,
            type: 'penalty',
            points: -Math.abs(Number(amount)), // Ensure it's negative
            note: reason || 'Points deducted by group leader',
            isSolo: false
        });

        await penalty.save();

        res.status(201).json({ 
            message: `Penalty of ${amount} points applied to ${targetUser.username}`,
            pointsDeducted: amount
        });
    } catch (err) {
        console.error('Apply penalty error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const stats = await calculateStats(req.user.id);
        const user = await User.findById(req.user.id).select('-password');
        
        const myActivities = await Activity.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(10);
        
        res.json({
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email,
                dob: user.dob,
                gender: user.gender,
                profilePic: user.profilePic,
                weeklyPoints: stats.points,
                workoutCount: stats.workouts,
                wakeupCount: stats.wakeups
            },
            activities: myActivities
        });
    } catch (err) {
        console.error('--- GET ME ERROR ---');
        console.error('User ID:', req.user?.id);
        console.error('Stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
