const User = require('../models/User');
const Activity = require('../models/Activity');
const { calculateStats } = require('../services/statsService');

exports.updateProfile = async (req, res) => {
    try {
        const { username, email, dob, gender } = req.body;
        
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
            { username, email, dob, gender },
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
