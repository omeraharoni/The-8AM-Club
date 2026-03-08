require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dns = require('dns');

// Force Node.js to use Google DNS to bypass local/ISP DNS issues (DEV ONLY)
if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG] Running in development mode. Bypassing local DNS with Google DNS.');
    dns.setServers(['8.8.8.8', '8.8.4.4']);
}

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
    serverSelectionTimeoutMS: 15000,
    family: 4,
})
    .then(() => {
        console.log('✅ MongoDB Connected Successfully!');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB Connection FAILED:', err);
        process.exit(1);
    });

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// REQUEST LOGGING
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST') {
        const keys = Object.keys(req.body || {});
        console.log(`[DEBUG] Body Keys: ${keys}`);
        if (keys.includes('proofImage')) console.log('[DEBUG] proofImage FOUND in request!');
    }
    next();
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

// API Routes
app.use('/api', authRoutes);
app.use('/api', activityRoutes);
app.use('/api', groupRoutes);
app.use('/api', invitationRoutes);
app.use('/api', userRoutes);

// --- SERVE FRONTEND ---
const distPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(distPath));

// Catch-all for SPA: if it's not an API call, serve index.html
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
});

// Error handler for missing API routes
app.use('/api', (req, res) => res.status(404).json({ message: 'API Route not found' }));

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error('--- UNHANDLED GLOBAL ERROR ---');
    console.error('URL:', req.url);
    console.error('Method:', req.method);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
        message: 'Internal Server Error', 
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
});
