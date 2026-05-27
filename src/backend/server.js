const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();
const PORT = 8000;

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

app.use(cors());
app.use(bodyParser.json());

const db = new sqlite3.Database('./db.sqlite', (err) => {
  if (err) {
    console.error('無法開啟資料庫', err.message);
  } else {
    console.log('已連線到 SQLite 資料庫');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
  )
`);
});


function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: 'No token' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}


function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}


// REGISTER
app.post('/auth/register', async (req, res) => {
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


// LOGIN
app.post('/auth/login', (req, res) => {
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
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ token, role: user.role, username: user.username });
    }
  );
});


// GET all posts
app.get('/posts', (req, res) => {
  const category = req.query.category;
  let sql = 'SELECT * FROM posts';
  const params = [];

  if (category) {
    sql += ' WHERE category = ?';
    params.push(category);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


// GET single post
app.get('/posts/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM posts WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});


// CREATE post (admin only)
app.post('/posts', authMiddleware, adminOnly, (req, res) => {
  const { title, content, category} = req.body;

  if (!title || !content || !category) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  db.run(
    `INSERT INTO posts (title, content, category) VALUES (?, ?, ?)`,
    [title, content, category],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.get(
        `SELECT * FROM posts WHERE id = ?`,
        [this.lastID],
        (err, row) => {
          res.status(201).json(row);
        }
      );
    }
  );
});


// UPDATE post (admin only)
app.put('/posts/:id', authMiddleware, adminOnly, (req, res) => {
  const { title, content, category } = req.body;

  db.run(
    `
    UPDATE posts
    SET title = ?, content = ?, category = ?, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
    [title, content, category, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: 'Not found' });

      db.get(
        'SELECT * FROM posts WHERE id = ?',
        [req.params.id],
        (err, row) => res.json(row)
      );
    }
  );
});


// DELETE post (admin only + cloudinary cleanup)
app.post('/posts/:id/delete', authMiddleware, adminOnly, (req, res) => {
  db.get('SELECT * FROM posts WHERE id = ?', [req.params.id], async (err, post) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!post) return res.status(404).json({ error: 'Not found' });

    const regex =
      /https:\/\/res\.cloudinary\.com\/dkoc0xopr\/image\/upload\/v\d+\/([^"'\s]+)/g;

    let match;
    const publicIds = [];

    while ((match = regex.exec(post.content)) !== null) {
      publicIds.push(match[1].replace(/\.[a-zA-Z]+$/, ''));
    }

    for (const pid of publicIds) {
      try {
        await cloudinary.uploader.destroy(pid);
      } catch (e) {
        console.error(e);
      }
    }

    db.run('DELETE FROM posts WHERE id = ?', [req.params.id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Deleted' });
    });
  });
});


// LIKE
app.post('/posts/:id/like', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const postId = req.params.id;

  db.get(
    `SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?`,
    [userId, postId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      // 已存在 → unlike
      if (row) {
        db.run(
          `DELETE FROM likes WHERE user_id = ? AND post_id = ?`,
          [userId, postId],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // 回傳最新 count
            db.get(
              `SELECT COUNT(*) as count FROM likes WHERE post_id = ?`,
              [postId],
              (err, countRow) => {
                if (err) return res.status(500).json({ error: err.message });

                res.json({
                  liked: false,
                  count: countRow.count
                });
              }
            );
          }
        );
      } else {
        // 不存在 → like
        db.run(
          `INSERT INTO likes (user_id, post_id) VALUES (?, ?)`,
          [userId, postId],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });

            db.get(
              `SELECT COUNT(*) as count FROM likes WHERE post_id = ?`,
              [postId],
              (err, countRow) => {
                if (err) return res.status(500).json({ error: err.message });

                res.json({
                  liked: true,
                  count: countRow.count
                });
              }
            );
          }
        );
      }
    }
  );
});


// GET number of likes of a post and current user state
app.get('/posts/:id/like-status', (req, res) => {
  const postId = req.params.id;

  const authHeader = req.headers.authorization;
  let userId = null;

  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch (err) {
      userId = null;
    }
  }

  db.get(
    `SELECT COUNT(*) as count FROM likes WHERE post_id = ?`,
    [postId],
    (err, countRow) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!userId) {
        return res.json({
          count: countRow.count,
          liked: false
        });
      }

      db.get(
        `SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?`,
        [userId, postId],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });

          res.json({
            count: countRow.count,
            liked: !!row
          });
        }
      );
    }
  );
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});