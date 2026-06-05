const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function createAuthRoutes({ db, jwtSecret }) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const hash = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'user')`,
      [username, email, hash],
      function (err) {
        if (err) {
          return res.status(400).json({ error: 'Username or email exists' });
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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = createAuthRoutes;
