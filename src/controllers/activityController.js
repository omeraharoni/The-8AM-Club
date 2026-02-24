const Activity = require('../models/Activity');
const User = require('../models/User');
const { calculateStats } = require('../services/statsService');

exports.logActivity = async (req, res) => {
    try {
        const { type, value, note, isShared } = req.body;
        const userId = req.user.id;
        const username = req.user.username;
        
        let pointsEarned = 0;
        const numValue = Number(value) || 0;
        
        console.log(`[ACTIVITY_LOG] User: ${username}, Type: ${type}, Value: ${numValue}`);

        if (type === 'workout') {
            // WORKOUT LOGIC
            if (numValue >= 45) pointsEarned = 10;
            else if (numValue >= 15) pointsEarned = 5;
            
            if (isShared) pointsEarned += 1;
            
            const activity = new Activity({
                userId,
                username,
                type,
                value: numValue,
                note: note || '',
                isShared: !!isShared,
                points: pointsEarned
            });
            await activity.save();
            return res.status(201).json({ message: 'Workout logged', pointsEarned });

        } else if (type === 'steps') {
            // FORCE MATH: (Steps / 1000) * 0.5
            const rawSteps = Number(value) || 0;
            const cappedSteps = Math.min(rawSteps, 15000);
            const calculatedPoints = (cappedSteps / 1000.0) * 0.5;
            
            // Re-assign to pointsEarned for safety
            pointsEarned = Number(calculatedPoints.toFixed(2));
            
            console.log(`[MATH_CHECK] Input: ${rawSteps}, Capped: ${cappedSteps}, Result: ${pointsEarned}`);
            
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
            
            const activity = new Activity({
                userId,
                username,
                type,
                value: numValue,
                note: note || '',
                points: pointsEarned
            });
            await activity.save();
            return res.status(201).json({ message: 'Sleep logged', pointsEarned });
        } else if (type === 'wakeup') {
            const now = new Date();
            if (now.getHours() < 8) pointsEarned = 5;
        }

        // Generic save for other types
        const activity = new Activity({
            userId,
            username,
            type,
            value: numValue,
            note: note || '',
            isShared: !!isShared,
            points: pointsEarned
        });
        
        await activity.save();
        res.status(201).json({ message: 'Activity logged', pointsEarned });

    } catch (err) {
        console.error('CRITICAL logActivity error:', err);
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
                weeklyPoints: stats.points,
                workoutCount: stats.workouts,
                wakeupCount: stats.wakeups
            },
            activities: myActivities
        });
    } catch (err) {
        console.error('getMe error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
