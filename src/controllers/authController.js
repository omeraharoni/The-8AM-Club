const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SECRET_KEY = process.env.SECRET_KEY || '8am-club-secret';

exports.register = async (req, res) => {
    try {
        const { username, password, email, dob, gender } = req.body;
        
        // Basic unique checks
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            const field = existingUser.username === username ? 'Username' : 'Email';
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
};

exports.googleLogin = async (req, res) => {
    try {
        const { email, name, googleId } = req.body;
        
        let user = await User.findOne({ $or: [{ googleId }, { email }] });
        
        if (!user) {
            // Create a new user if they don't exist
            user = new User({
                username: name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
                email,
                googleId,
                password: await bcrypt.hash(Math.random().toString(36), 10), // Random password for social login
            });
            await user.save();
        } else if (!user.googleId) {
            // Link Google ID if user exists with same email but no Google ID
            user.googleId = googleId;
            await user.save();
        }

        const token = jwt.sign({ id: user._id, username: user.username }, SECRET_KEY);
        res.json({ token, user: { id: user._id, username: user.username } });
    } catch (err) {
        console.error('Google login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
