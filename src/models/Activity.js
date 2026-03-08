const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: String,
    type: { type: String, required: true },
    value: { type: Number, default: 0 },
    note: String,
    isShared: { type: Boolean, default: false },
    isSolo: { type: Boolean, default: true },
    points: { type: Number, default: 0 },
    proofImage: String, // Base64 compressed string
    expiresAt: { type: Date }, // TTL Field
    timestamp: { type: Date, default: Date.now }
});

// Auto-delete document when expiresAt time is reached
ActivitySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Activity', ActivitySchema);
