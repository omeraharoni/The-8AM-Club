const Activity = require('../models/Activity');
const { calculateStats } = require('../services/statsService');

exports.logActivity = async (req, res) => {
    try {
        const { type, value, note } = req.body;
        let pointsEarned = 0;
        
        if (type === 'workout') {
            if (value >= 45) pointsEarned = 10;
            else if (value >= 15) pointsEarned = 5;
        } else if (type === 'steps') {
            pointsEarned = Math.floor(value / 1000);
        } else if (type === 'sleep') {
            if (value >= 7) pointsEarned = 5;
        } else if (type === 'wakeup') {
            const now = new Date();
            if (now.getHours() < 8) pointsEarned = 5;
        }

        const activity = new Activity({
            userId: req.user.id,
            username: req.user.username,
            type,
            value: value || 0,
            note: note || '',
            points: pointsEarned
        });
        
        await activity.save();
        res.status(201).json({ message: 'Activity logged', pointsEarned });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const stats = await calculateStats(req.user.id);
        const myActivities = await Activity.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(10);
        
        res.json({
            user: { 
                id: req.user.id, 
                username: req.user.username, 
                weeklyPoints: stats.points,
                workoutCount: stats.workouts,
                wakeupCount: stats.wakeups
            },
            activities: myActivities
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
