const jwt = require('jsonwebtoken');
const db = require('./db');

/* ================== AUTH MIDDLEWARE =================== */

const requireAuth = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).send({ error: 'Unauthorized' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const user = await db.user.findById(payload.sub);

        if (!user) {
            return res.status(401).send({ error: 'Unauthorized' });
        }

        req.user = user;
        next();
    } catch {
        return res.status(401).send({ error: 'Unauthorized' });
    }
};

module.exports = { requireAuth };
