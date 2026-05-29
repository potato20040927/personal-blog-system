const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function createAuthRoutes({ db, jwtSecret }) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const hash = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'user')`,
      [username, hash],
      function (err) {
        if (err) {
          return res.status(400).json({ error: 'Username exists' });
        }

        res.json({ message: 'Register success' });
      }
    );
  });

  router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(
      `SELECT * FROM users WHERE username = ?`,
      [username],
      async (err, user) => {
        if (err || !user) {
          return res.status(401).json({ error: 'Login failed' });
        }

        const ok = await bcrypt.compare(password, user.password_hash);

        if (!ok) {
          return res.status(401).json({ error: 'Login failed' });
        }

        const token = jwt.sign(
          {
            id: user.id,
            username: user.username,
            role: user.role,
          },
          jwtSecret,
          { expiresIn: '7d' }
        );

        res.json({ token, role: user.role, username: user.username });
      }
    );
  });

  return router;
}

module.exports = createAuthRoutes;
