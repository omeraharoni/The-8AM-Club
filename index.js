const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = '8am-club-secret';
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());

// Initialize DB structure
const INITIAL_DB = {
    users: [],
    activities: [],
    groups: [],
    memberships: [],
    invitations: []
};

if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DB, null, 2));
}

const readDB = () => JSON.parse(fs.readFileSync(DB_PATH));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// Helper for weekly points
const getStartOfWeek = () => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
};

const calculatePoints = (db, userId) => {
    const startOfWeek = getStartOfWeek();
    const userActivities = db.activities.filter(a => 
        a.userId === userId && 
        new Date(a.timestamp) >= startOfWeek
    );
    
    return userActivities.reduce((sum, act) => sum + act.points, 0);
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
    const { username, password } = req.body;
    const db = readDB();
    if (db.users.find(u => u.username === username)) {
        return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now(), username, password: hashedPassword };
    db.users.push(newUser);
    writeDB(db);
    res.status(201).json({ message: 'User registered' });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY);
    res.json({ token, user: { id: user.id, username: user.username } });
});

// --- ACTIVITY ROUTES ---
app.post('/api/activity', authenticateToken, (req, res) => {
    const { type, value, note } = req.body;
    const db = readDB();
    
    let pointsEarned = 0;
    if (type === 'workout') {
        if (value >= 45) {
            pointsEarned = 10;
        } else if (value >= 15) {
            pointsEarned = 5;
        }
    } else if (type === 'steps') {
        pointsEarned = Math.floor(value / 1000);
    } else if (type === 'sleep') {
        if (value >= 7) {
            pointsEarned = 5;
        }
    } else if (type === 'wakeup') {
        const now = new Date();
        const hour = now.getHours();
        // Award 5 points only if before 8:00 AM
        if (hour < 8) {
            pointsEarned = 5;
        } else {
            pointsEarned = 0;
        }
    }

    const activity = {
        id: Date.now(),
        userId: req.user.id,
        username: req.user.username,
        type,
        value: value || 0,
        note: note || '',
        points: pointsEarned,
        timestamp: new Date().toISOString()
    };
    
    db.activities.push(activity);
    writeDB(db);
    res.status(201).json({ message: 'Activity logged', pointsEarned });
});

app.get('/api/me', authenticateToken, (req, res) => {
    const db = readDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.sendStatus(404);
    
    const startOfWeek = getStartOfWeek();
    const weeklyActivities = db.activities.filter(a => 
        a.userId === req.user.id && 
        new Date(a.timestamp) >= startOfWeek
    );
    
    const weeklyPoints = weeklyActivities.reduce((sum, act) => sum + act.points, 0);
    const workoutCount = weeklyActivities.filter(a => a.type === 'workout').length;
    const wakeupCount = weeklyActivities.filter(a => a.type === 'wakeup').length;
    
    const myActivities = db.activities.filter(a => a.userId === req.user.id);
    
    res.json({
        user: { 
            id: user.id, 
            username: user.username, 
            weeklyPoints,
            workoutCount,
            wakeupCount
        },
        activities: myActivities.reverse().slice(0, 10)
    });
});

const calculateStats = (db, userId) => {
    const startOfWeek = getStartOfWeek();
    const userActivities = db.activities.filter(a => 
        a.userId === userId && 
        new Date(a.timestamp) >= startOfWeek
    );
    
    return {
        points: userActivities.reduce((sum, act) => sum + act.points, 0),
        workouts: userActivities.filter(a => a.type === 'workout').length,
        wakeups: userActivities.filter(a => a.type === 'wakeup').length,
        sleep: userActivities.filter(a => a.type === 'sleep').length,
        steps: userActivities.filter(a => a.type === 'steps').reduce((sum, act) => sum + act.value, 0)
    };
};

// --- GROUP ROUTES ---
app.post('/api/groups', authenticateToken, (req, res) => {
    const { name } = req.body;
    const db = readDB();
    
    const newGroup = {
        id: Date.now(),
        name,
        ownerId: req.user.id
    };
    
    db.groups.push(newGroup);
    db.memberships.push({
        groupId: newGroup.id,
        userId: req.user.id,
        role: 'owner'
    });
    
    writeDB(db);
    res.status(201).json(newGroup);
});

app.get('/api/groups', authenticateToken, (req, res) => {
    const db = readDB();
    const userMemberships = db.memberships.filter(m => m.userId === req.user.id);
    const groupIds = userMemberships.map(m => m.groupId);
    const myGroups = db.groups.filter(g => groupIds.includes(g.id));
    
    res.json(myGroups);
});

app.get('/api/groups/:groupId/leaderboard', authenticateToken, (req, res) => {
    const groupId = parseInt(req.params.groupId);
    const db = readDB();
    
    // Check membership
    if (!db.memberships.find(m => m.groupId === groupId && m.userId === req.user.id)) {
        return res.status(403).json({ message: 'Not a member of this group' });
    }
    
    const members = db.memberships.filter(m => m.groupId === groupId);
    const leaderboard = members.map(m => {
        const user = db.users.find(u => u.id === m.userId);
        const stats = calculateStats(db, m.userId);
        return {
            username: user ? user.username : 'Unknown',
            weeklyPoints: stats.points,
            workouts: stats.workouts,
            wakeups: stats.wakeups,
            sleep: stats.sleep,
            steps: stats.steps
        };
    }).sort((a, b) => b.weeklyPoints - a.weeklyPoints);
    
    res.json(leaderboard);
});

// --- INVITATION ROUTES ---
app.post('/api/invitations', authenticateToken, (req, res) => {
    const { groupId, targetUsername } = req.body;
    const db = readDB();
    
    const targetUser = db.users.find(u => u.username === targetUsername);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    
    // Check if already member
    if (db.memberships.find(m => m.groupId === groupId && m.userId === targetUser.id)) {
        return res.status(400).json({ message: 'User is already a member' });
    }
    
    const invitation = {
        id: Date.now(),
        groupId,
        groupName: db.groups.find(g => g.id === groupId).name,
        fromUserId: req.user.id,
        fromUsername: req.user.username,
        toUserId: targetUser.id,
        status: 'pending'
    };
    
    db.invitations.push(invitation);
    writeDB(db);
    res.status(201).json({ message: 'Invitation sent' });
});

app.get('/api/invitations', authenticateToken, (req, res) => {
    const db = readDB();
    const myInvites = db.invitations.filter(i => i.toUserId === req.user.id && i.status === 'pending');
    res.json(myInvites);
});

app.post('/api/invitations/:id/respond', authenticateToken, (req, res) => {
    const { accept } = req.body;
    const inviteId = parseInt(req.params.id);
    const db = readDB();
    
    const invite = db.invitations.find(i => i.id === inviteId && i.toUserId === req.user.id);
    if (!invite) return res.status(404).json({ message: 'Invitation not found' });
    
    if (accept) {
        db.memberships.push({
            groupId: invite.groupId,
            userId: req.user.id,
            role: 'member'
        });
        invite.status = 'accepted';
    } else {
        invite.status = 'rejected';
    }
    
    writeDB(db);
    res.json({ message: accept ? 'Joined group' : 'Invitation rejected' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://192.168.1.247:${PORT}`);
});
