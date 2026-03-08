const User = require('../models/User');
const Activity = require('../models/Activity');
const { calculateStats } = require('../services/statsService');

exports.updateProfile = async (req, res) => {
    try {
        const { username, email, dob, gender, profilePic } = req.body;
        
        const existing = await User.findOne({ 
            _id: { $ne: req.user.id }, 
            $or: [{ username }, { email }] 
        });
        
        if (existing) {
            const field = existing.username === username ? 'Username' : 'Email';
            return res.status(400).json({ message: `${field} is already taken` });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { username, email, dob, gender, profilePic },
            { new: true }
        ).select('-password');

        // Calculate stats so the frontend cache stays consistent
        const stats = await calculateStats(req.user.id);
        
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
            }
        });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const { calculatePersonalProgress, calculateGroupProgress } = require('../services/statsService');

exports.getProgress = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            console.error('[GET_PROGRESS] No user ID in request');
            return res.status(401).json({ message: 'Unauthorized: No user ID found' });
        }
        const userId = req.user.id;
        const personal = await calculatePersonalProgress(userId);
        const groupStats = await calculateGroupProgress(userId);
        
        // Fetch personal targets
        const user = await User.findById(userId);

        res.json({
            personal,
            groupStats,
            targets: user.targets || { wakeup: 5, workout: 4 }
        });
    } catch (err) {
        console.error('--- GET PROGRESS ERROR ---');
        console.error('User ID:', req.user?.id);
        console.error('Stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
