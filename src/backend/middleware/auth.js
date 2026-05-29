const jwt = require('jsonwebtoken');

function createAuthMiddleware(jwtSecret) {
  return function authMiddleware(req, res, next) {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ error: 'No token' });
    }

    const token = header.split(' ')[1];

    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

module.exports = {
  adminOnly,
  createAuthMiddleware,
};
