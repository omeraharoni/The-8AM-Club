const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || '8am-club-secret';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        console.warn(`[AUTH] 401 Unauthorized for ${req.url}`);
        return res.sendStatus(401);
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.warn(`[AUTH] 403 Forbidden for ${req.url}: ${err.message}`);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

module.exports = {
    authenticateToken
};
