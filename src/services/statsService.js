const Activity = require('../models/Activity');

const getStartOfWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
};

const calculateStats = async (userId) => {
    const startOfWeek = getStartOfWeek();
    const userActivities = await Activity.find({
        userId: userId,
        timestamp: { $gte: startOfWeek }
    });
    
    return {
        points: userActivities.reduce((sum, act) => sum + act.points, 0),
        workouts: userActivities.filter(a => a.type === 'workout').length,
        wakeups: userActivities.filter(a => a.type === 'wakeup').length,
        sleep: userActivities.filter(a => a.type === 'sleep').length,
        steps: userActivities.filter(a => a.type === 'steps').reduce((sum, act) => sum + act.value, 0)
    };
};

module.exports = {
    getStartOfWeek,
    calculateStats
};
