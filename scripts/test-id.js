const mongoose = require('mongoose');

try {
    const id = new mongoose.Types.ObjectId();
    console.log('Original ID:', id);
    const wrapped = new mongoose.Types.ObjectId(id);
    console.log('Wrapped ID:', wrapped);
    console.log('Equal?', id.toString() === wrapped.toString());
} catch (e) {
    console.error('Error wrapping ObjectId:', e.message);
}
