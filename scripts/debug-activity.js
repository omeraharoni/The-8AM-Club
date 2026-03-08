const mongoose = require('mongoose');

async function debug() {
    try {
        await mongoose.connect('mongodb+srv://pilot8AM:tja7xDNthkyMAHoM@8am-club-cluster.4etfgzt.mongodb.net/8am-club?retryWrites=true&w=majority');
        const db = mongoose.connection.useDb('8am-club');
        const activities = await db.collection('activities').find().sort({ timestamp: -1 }).limit(5).toArray();
        
        console.log('--- LATEST 5 ACTIVITIES ---');
        activities.forEach(a => {
            console.log(`ID: ${a._id}`);
            console.log(`Type: ${a.type}`);
            console.log(`User: ${a.username}`);
            console.log(`Photo Keys: ${Object.keys(a).filter(k => k.includes('proof') || k.includes('Image'))}`);
            console.log(`ProofImage Length: ${a.proofImage ? a.proofImage.length : 'NULL'}`);
            console.log(`Timestamp: ${a.timestamp}`);
            console.log('---------------------------');
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
debug();
