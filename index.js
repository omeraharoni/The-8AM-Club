require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY || '8am-club-secret';

// Connect to MongoDB
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('CRITICAL: MONGODB_URI is not defined!');
} else {
    // Mask password for safe logging
    const masked = uri.replace(/:([^@]+)@/, ':****@');
    console.log(`Attempting to connect to: ${masked}`);
}

mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000, // Fail fast (5s) to show error in logs
})
    .then(() => {
        console.log('✅ MongoDB Connected Successfully!');
        // Only start server if DB connects
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB Connection FAILED:', err.message);
        // Don't start server so Render knows it failed
        process.exit(1);
    });

// Health check route
app.get('/health', (req, res) => {
    const state = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({ 
        status: state === 1 ? 'ok' : 'error',
        dbState: states[state] || 'unknown'
    });
});

// --- MODELS ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const ActivitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: String,
    type: { type: String, required: true },
    value: { type: Number, default: 0 },
    note: String,
    points: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
});
const Activity = mongoose.model('Activity', ActivitySchema);

const GroupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const Group = mongoose.model('Group', GroupSchema);

const MembershipSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, default: 'member' }
});
const Membership = mongoose.model('Membership', MembershipSchema);

const InvitationSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    groupName: String,
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fromUsername: String,
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, default: 'pending' }
});
const Invitation = mongoose.model('Invitation', InvitationSchema);

app.use(cors());
app.use(bodyParser.json());

// --- HELPERS ---
const getStartOfWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
};

const calculateStats = async (userId) => {
    const startOfWeek = getStartOfWeek();
    const userActivities = await Activity.find({
        userId: userId,
        timestamp: { $gte: startOfWeek }
    });
    
    return {
        points: userActivities.reduce((sum, act) => sum + act.points, 0),
        workouts: userActivities.filter(a => a.type === 'workout').length,
        wakeups: userActivities.filter(a => a.type === 'wakeup').length,
        sleep: userActivities.filter(a => a.type === 'sleep').length,
        steps: userActivities.filter(a => a.type === 'steps').reduce((sum, act) => sum + act.value, 0)
    };
};

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- AUTH ROUTES ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ message: 'User already exists' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user._id, username: user.username }, SECRET_KEY);
        res.json({ token, user: { id: user._id, username: user.username } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- ACTIVITY ROUTES ---
app.post('/api/activity', authenticateToken, async (req, res) => {
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
});

app.get('/api/me', authenticateToken, async (req, res) => {
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
});

// --- GROUP ROUTES ---
app.post('/api/groups', authenticateToken, async (req, res) => {
    try {
        const newGroup = new Group({ name: req.body.name, ownerId: req.user.id });
        await newGroup.save();
        const membership = new Membership({ groupId: newGroup._id, userId: req.user.id, role: 'owner' });
        await membership.save();
        res.status(201).json(newGroup);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/groups', authenticateToken, async (req, res) => {
    try {
        const memberships = await Membership.find({ userId: req.user.id }).populate('groupId');
        const myGroups = memberships.map(m => m.groupId);
        res.json(myGroups);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/groups/:groupId/leaderboard', authenticateToken, async (req, res) => {
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
});

// --- INVITATION ROUTES ---
app.post('/api/invitations', authenticateToken, async (req, res) => {
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
});

app.get('/api/invitations', authenticateToken, async (req, res) => {
    try {
        const myInvites = await Invitation.find({ toUserId: req.user.id, status: 'pending' });
        res.json(myInvites);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/invitations/:id/respond', authenticateToken, async (req, res) => {
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
});

// --- SERVE FRONTEND ---
const distPath = path.join(__dirname, 'client', 'dist');

// Static files from React build
app.use(express.static(distPath));

// Diagnostic route
app.get('/debug-dist', (req, res) => {
    const fs = require('fs');
    const exists = fs.existsSync(distPath);
    const files = exists ? fs.readdirSync(distPath) : [];
    res.json({ distPath, exists, files });
});

// For any route that doesn't match an API route, send back the index.html
app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Error sending index.html:', err);
            res.status(404).send('Frontend not built or index.html missing. Please check build logs.');
        }
    });
});
