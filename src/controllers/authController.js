const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SECRET_KEY = process.env.SECRET_KEY || '8am-club-secret';

exports.register = async (req, res) => {
    try {
        let { username, password, email, dob, gender } = req.body;
        
        // Trim and normalize
        username = username?.trim();
        email = email?.trim()?.toLowerCase();
        password = password?.trim();

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // Escape regex special characters
        const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Case-insensitive unique checks
        const existingUser = await User.findOne({ 
            $or: [
                { username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') } }, 
                { email }
            ] 
        });
        
        if (existingUser) {
            // Allow linking if email matches (especially for Google users)
            if (existingUser.email.toLowerCase() === email.toLowerCase()) {
                const hashedPassword = await bcrypt.hash(password, 10);
                existingUser.password = hashedPassword;
                existingUser.username = username; // Update to the requested username
                await existingUser.save();
                return res.status(200).json({ message: 'Account linked successfully! You can now log in with either method.' });
            }
            const field = existingUser.email === email ? 'Email' : 'Username';
            return res.status(400).json({ message: `${field} already exists` });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ 
            username, 
            password: hashedPassword,
            email,
            dob,
            gender
        });
        await newUser.save();
        res.status(201).json({ message: 'User registered' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        let { username, password } = req.body;
        
        // Trim and normalize
        const identifier = username?.trim();
        
        if (!identifier || !password) {
            return res.status(400).json({ message: 'Username/Email and password are required' });
        }

        console.log(`[LOGIN_ATTEMPT] Input: "${identifier}"`);
        
        // Escape regex special characters
        const escapedQuery = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Lookup by username OR email (case-insensitive)
        const user = await User.findOne({ 
            $or: [
                { username: { $regex: new RegExp(`^${escapedQuery}$`, 'i') } },
                { email: { $regex: new RegExp(`^${escapedQuery}$`, 'i') } }
            ]
        });

        if (!user) {
            console.warn(`[LOGIN_FAILED] User not found: "${identifier}"`);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            if (user.googleId) {
                return res.status(400).json({ message: 'This account is linked to Google. Please sign in with Google.' });
            }
            console.warn(`[LOGIN_FAILED] Password mismatch for user: "${user.username}"`);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        console.log(`[LOGIN_SUCCESS] User: "${user.username}"`);
        const token = jwt.sign({ id: user._id, username: user.username }, SECRET_KEY);
        res.json({ token, user: { id: user._id, username: user.username } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const { email, name, googleId } = req.body;
        const normalizedEmail = email.toLowerCase();
        
        // 1. Find user by googleId OR email
        let user = await User.findOne({ 
            $or: [
                { googleId }, 
                { email: normalizedEmail }
            ] 
        });
        
        if (!user) {
            // 2. Create NEW user only if they don't exist at all
            console.log(`[GOOGLE_AUTH] Creating new user for: ${normalizedEmail}`);
            user = new User({
                username: name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 100),
                email: normalizedEmail,
                googleId,
                // Placeholder password for social users
                password: await bcrypt.hash(Math.random().toString(36), 10),
            });
            await user.save();
        } else {
            // 3. If user exists but doesn't have googleId linked, link it now
            if (!user.googleId) {
                console.log(`[GOOGLE_AUTH] Linking Google ID to existing account: ${normalizedEmail}`);
                user.googleId = googleId;
                await user.save();
            }
            console.log(`[GOOGLE_AUTH] Welcome back: ${user.username}`);
        }

        const token = jwt.sign({ id: user._id, username: user.username }, SECRET_KEY);
        res.json({ token, user: { id: user._id, username: user.username } });
    } catch (err) {
        console.error('Google login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
