const Group = require('../models/Group');
const Membership = require('../models/Membership');
const { calculateStats } = require('../services/statsService');

exports.createGroup = async (req, res) => {
    try {
        const newGroup = new Group({ name: req.body.name, ownerId: req.user.id });
        await newGroup.save();
        const membership = new Membership({ groupId: newGroup._id, userId: req.user.id, role: 'owner' });
        await membership.save();
        res.status(201).json(newGroup);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getGroups = async (req, res) => {
    try {
        const memberships = await Membership.find({ userId: req.user.id }).populate('groupId');
        const myGroups = memberships.map(m => m.groupId);
        res.json(myGroups);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const members = await Membership.find({ groupId }).populate('userId');
        
        const leaderboard = await Promise.all(members.map(async (m) => {
            const stats = await calculateStats(m.userId._id);
            return {
                username: m.userId.username,
                weeklyPoints: stats.points,
                workouts: stats.workouts,
                wakeups: stats.wakeups,
                sleep: stats.sleep,
                steps: stats.steps
            };
        }));
        
        res.json(leaderboard.sort((a, b) => b.weeklyPoints - a.weeklyPoints));
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
