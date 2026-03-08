const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
});
const User = mongoose.model('User', UserSchema);

const GroupSchema = new mongoose.Schema({
    name: String,
    joinCode: String,
});
const Group = mongoose.model('Group', GroupSchema);

const MembershipSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});
const Membership = mongoose.model('Membership', MembershipSchema);

async function check() {
    try {
        await mongoose.connect('mongodb+srv://pilot8AM:tja7xDNthkyMAHoM@8am-club-cluster.4etfgzt.mongodb.net/8am-club?retryWrites=true&w=majority');
        console.log('--- CONNECTED ---\n');

        const users = await User.find();
        console.log(`TOTAL USERS: ${users.length}`);
        users.forEach(u => console.log(`- ${u.username} (${u.email}) [ID: ${u._id}]`));

        const groups = await Group.find();
        console.log(`\nTOTAL GROUPS: ${groups.length}`);
        for (const g of groups) {
            console.log(`\nGROUP: ${g.name} [Code: ${g.joinCode}] [ID: ${g._id}]`);
            const members = await Membership.find({ groupId: g._id }).populate('userId');
            console.log(`  Members (${members.length}):`);
            members.forEach(m => {
                if (m.userId) {
                    console.log(`  - ${m.userId.username} [ID: ${m.userId._id}]`);
                } else {
                    console.log(`  - NULL USER [Membership ID: ${m._id}] [User ID ref: ${m.userId}]`);
                }
            });
        }

        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
check();
