const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    dob: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer-not-to-say'] },
    profilePic: { type: String }, // Base64 compressed string
    googleId: { type: String, sparse: true },
    targets: {
        wakeup: { type: Number, default: 5 },
        workout: { type: Number, default: 4 }
    }
});

module.exports = mongoose.model('User', UserSchema);
