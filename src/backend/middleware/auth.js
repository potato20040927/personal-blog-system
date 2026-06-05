const jwt = require('jsonwebtoken');

function createAuthMiddleware(jwtSecret, db) {
  return function authMiddleware(req, res, next) {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ error: 'No token' });
    }

    const token = header.split(' ')[1];

    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (!db) {
        req.user = decoded;
        next();
        return;
      }

      db.get(
        `SELECT id, username, role FROM users WHERE id = ?`,
        [decoded.id],
        (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Authentication failed' });
          }

          if (!user) {
            return res.status(401).json({ error: 'User no longer exists' });
          }

          req.user = {
            id: user.id,
            username: user.username,
            role: user.role,
          };
          next();
        }
      );
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
