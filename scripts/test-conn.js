const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, sparse: true }
});
const User = mongoose.model('User', UserSchema);

async function check() {
    try {
        await mongoose.connect('mongodb+srv://pilot8AM:tja7xDNthkyMAHoM@8am-club-cluster.4etfgzt.mongodb.net/8am-club?retryWrites=true&w=majority');
        console.log('Connected');
        const user = await User.findOne({ 
            $or: [
                { username: /Omeraharoni/i },
                { email: /Omeraharoni/i }
            ]
        });
        if (user) {
            console.log('FOUND:', {
                username: user.username,
                email: user.email,
                hasGoogle: !!user.googleId,
                hasPassword: !!user.password
            });
        } else {
            console.log('NOT FOUND');
        }
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
check();
