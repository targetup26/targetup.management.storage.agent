const jwt = require('jsonwebtoken');
const logger = require('./logger');

function validateJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        logger.warn('Missing authorization header', { ip: req.ip });
        return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        logger.warn('Invalid authorization format', { ip: req.ip });
        return res.status(401).json({ error: 'Invalid authorization format' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        logger.error('JWT validation failed', {
            error: error.message,
            ip: req.ip
        });
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = { validateJWT };
