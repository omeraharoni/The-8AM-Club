require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const activityRoutes = require('./src/routes/activityRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const invitationRoutes = require('./src/routes/invitationRoutes');
const userRoutes = require('./src/routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('CRITICAL: MONGODB_URI is not defined!');
} else {
    const masked = uri.replace(/:([^@]+)@/, ':****@');
    console.log(`Attempting to connect to: ${masked}`);
}

mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
})
    .then(() => {
        console.log('✅ MongoDB Connected Successfully!');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB Connection FAILED:', err.message);
        process.exit(1);
    });

app.use(cors());
app.use(bodyParser.json());

// Health check route
app.get('/health', (req, res) => {
    const state = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({ 
        status: state === 1 ? 'ok' : 'error',
        dbState: states[state] || 'unknown'
    });
});

// API Routes
app.use('/api', authRoutes);
app.use('/api', activityRoutes); // includes /me and /activity
app.use('/api/groups', groupRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/user', userRoutes);

// --- SERVE FRONTEND ---
const distPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(distPath));

// For any route that doesn't match an API route, send back the index.html
app.use((req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Error sending index.html:', err);
            res.status(404).send('Frontend not built or index.html missing.');
        }
    });
});
