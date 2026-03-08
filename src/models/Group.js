const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General' },
    imageUrl: { type: String, default: '' },
    joinCode: { type: String, unique: true, sparse: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    wakeupTimeTarget: { type: String, default: '08:00' }, // "HH:mm" format
    weeklyWakeupTarget: { type: Number, default: 5 },
    weeklyWorkoutTarget: { type: Number, default: 4 }
});

module.exports = mongoose.model('Group', GroupSchema);
