const Activity = require('../models/Activity');
const User = require('../models/User');
const Membership = require('../models/Membership');
const Group = require('../models/Group');
const mongoose = require('mongoose');

const getStartOfWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
};

const calculateStats = async (userId, groupId = null) => {
    try {
        const startOfWeek = getStartOfWeek();
        const uid = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
        
        const userActivities = await Activity.find({
            userId: uid,
            timestamp: { $gte: startOfWeek }
        });
        
        const workouts = userActivities.filter(a => a.type === 'workout');
        const wakeups = userActivities.filter(a => a.type === 'wakeup');
        const sleepLogs = userActivities.filter(a => a.type === 'sleep');
        const stepLogs = userActivities.filter(a => a.type === 'steps');

        const totalSleep = sleepLogs.reduce((sum, act) => sum + act.value, 0);
        const totalSteps = stepLogs.reduce((sum, act) => sum + act.value, 0);

        let points = userActivities.reduce((sum, act) => sum + act.points, 0);
        
        // --- WEEKLY GOAL BONUS ---
        if (groupId) {
            const group = await Group.findById(groupId);
            if (group) {
                // Workout Bonus: If user reached the weekly workout target
                if (group.weeklyWorkoutTarget && workouts.length >= group.weeklyWorkoutTarget) {
                    points += 10; // Bonus points for hitting the target
                }
                
                // Wakeup Bonus: If user reached the weekly wakeup target
                const successfulWakeups = group.wakeupTimeTarget === 'none' 
                    ? wakeups.length 
                    : wakeups.filter(a => a.points > 0).length;

                if (group.weeklyWakeupTarget && successfulWakeups >= group.weeklyWakeupTarget) {
                    points += 10;
                }
            }
        }

        return {
            points: Number(points.toFixed(2)),
            workouts: workouts.length,
            // "On-time" wakeups are those that earned points (> 0)
            onTimeRises: wakeups.filter(a => a.points > 0).length,
            wakeups: wakeups.length,
            avgSleep: sleepLogs.length > 0 ? (totalSleep / sleepLogs.length).toFixed(1) : 0,
            avgSteps: stepLogs.length > 0 ? Math.round(totalSteps / stepLogs.length) : 0,
            // Keeping raw values just in case
            totalSteps: totalSteps,
            totalSleep: totalSleep
        };
    } catch (err) {
        console.error('--- CALCULATE STATS ERROR ---');
        console.error('User ID input:', userId);
        throw err;
    }
};

const calculatePersonalProgress = async (userId) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const uid = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const activities = await Activity.find({
        userId: uid,
        timestamp: { $gte: thirtyDaysAgo }
    }).sort({ timestamp: -1 });

    const workouts = activities.filter(a => a.type === 'workout');
    const wakeups = activities.filter(a => a.type === 'wakeup' && a.points > 0);
    const sleepLogs = activities.filter(a => a.type === 'sleep');
    const stepLogs = activities.filter(a => a.type === 'steps');

    // --- STREAK LOGIC ---
    const wakeupDates = new Set(
        wakeups.map(a => new Date(a.timestamp).toISOString().split('T')[0])
    );
    
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    // If no wakeup today yet, check yesterday to start streak
    if (!wakeupDates.has(checkDate.toISOString().split('T')[0])) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    const MAX_STREAK_CHECK = 365; // Safety break
    while (wakeupDates.has(checkDate.toISOString().split('T')[0]) && currentStreak < MAX_STREAK_CHECK) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    // Longest streak in last 30 days
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate = null;
    
    const sortedWakeupDates = Array.from(wakeupDates).sort();
    sortedWakeupDates.forEach(dateStr => {
        const currentDate = new Date(dateStr);
        if (lastDate) {
            const diffTime = Math.abs(currentDate - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                tempStreak++;
            } else {
                tempStreak = 1;
            }
        } else {
            tempStreak = 1;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        lastDate = currentDate;
    });

    return {
        thirtyDayStats: {
            workouts: workouts.length,
            wakeups: wakeups.length,
            avgSleep: sleepLogs.length > 0 ? (sleepLogs.reduce((s, a) => s + a.value, 0) / sleepLogs.length).toFixed(1) : 0,
            stepConsistency: stepLogs.filter(a => a.value >= 10000).length // Days meeting 10k steps
        },
        streaks: {
            current: currentStreak,
            longest: longestStreak
        }
    };
};

const calculateGroupProgress = async (userId) => {
    // 1. Get groups user belongs to
    const uid = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const memberships = await Membership.find({ userId: uid });
    const groupIds = memberships.map(m => m.groupId);

    const startOfWeek = getStartOfWeek();

    const progressReports = await Promise.all(groupIds.map(async (groupId) => {
        if (!groupId) return null;
        const group = await Group.findById(groupId);
        if (!group) return null;

        const members = await Membership.find({ groupId });
        const memberIds = members.map(m => m.userId).filter(id => id != null);

        // Fetch targets for all members
        const userObjects = await User.find({ _id: { $in: memberIds } });
        
        // Sum individual targets for collective goal
        const totalWakeupTarget = userObjects.reduce((sum, u) => sum + (u.targets?.wakeup || 5), 0);
        const totalWorkoutTarget = userObjects.reduce((sum, u) => sum + (u.targets?.workout || 4), 0);

        // Fetch weekly activities for all members
        const groupActivities = await Activity.find({
            userId: { $in: memberIds },
            timestamp: { $gte: startOfWeek }
        });

        const totalWakeups = groupActivities.filter(a => 
            a.type === 'wakeup' && (group.wakeupTimeTarget === 'none' || a.points > 0)
        ).length;
        const totalWorkouts = groupActivities.filter(a => a.type === 'workout').length;

        // User's contribution
        const myWakeups = groupActivities.filter(a => 
            a.userId && a.userId.toString() === uid.toString() && 
            a.type === 'wakeup' && (group.wakeupTimeTarget === 'none' || a.points > 0)
        ).length;
        const myWorkouts = groupActivities.filter(a => a.userId && a.userId.toString() === uid.toString() && a.type === 'workout').length;

        return {
            groupId: group._id,
            name: group.name,
            targets: {
                wakeup: totalWakeupTarget,
                workout: totalWorkoutTarget
            },
            actual: {
                wakeup: totalWakeups,
                workout: totalWorkouts
            },
            myContribution: {
                wakeup: totalWakeupTarget > 0 ? (myWakeups / totalWakeupTarget * 100).toFixed(1) : 0,
                workout: totalWorkoutTarget > 0 ? (myWorkouts / totalWorkoutTarget * 100).toFixed(1) : 0
            }
        };
    }));

    return progressReports.filter(p => p !== null);
};

module.exports = {
    getStartOfWeek,
    calculateStats,
    calculatePersonalProgress,
    calculateGroupProgress
};
