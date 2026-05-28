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

const sseClients = new Set();

function broadcastSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    client.write(payload);
  });
}

app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.flushHeaders();
  res.write('retry: 10000\n\n');

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

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
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.all(`PRAGMA table_info(comments)`, (err, columns) => {
    if (err) {
      console.error('無法檢查 comments 資料表', err.message);
      return;
    }

    const hasUpdatedAt = columns.some((column) => column.name === 'updatedAt');
    if (!hasUpdatedAt) {
      db.run(
        `ALTER TABLE comments ADD COLUMN updatedAt DATETIME`,
        (alterErr) => {
          if (alterErr) {
            console.error('無法新增 comments.updatedAt 欄位', alterErr.message);
            return;
          }

          db.run(`UPDATE comments SET updatedAt = createdAt WHERE updatedAt IS NULL`);
        }
      );
    }
  });
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

  let sql = `
    SELECT 
      posts.*,
      COUNT(likes.id) AS likeCount
    FROM posts
    LEFT JOIN likes ON posts.id = likes.post_id
  `;

  const params = [];

  if (category) {
    sql += ' WHERE posts.category = ?';
    params.push(category);
  }

  sql += ' GROUP BY posts.id';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


// GET single post
app.get('/posts/:id', (req, res) => {
  const id = req.params.id;
  db.get(`
    SELECT
      posts.*,
      COUNT(likes.id) AS likeCount
    FROM posts
    LEFT JOIN likes ON posts.id = likes.post_id
    WHERE posts.id = ?
    GROUP BY posts.id
  `, [id], (err, row) => {
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
        `
        SELECT
          posts.*,
          COUNT(likes.id) AS likeCount
        FROM posts
        LEFT JOIN likes ON posts.id = likes.post_id
        WHERE posts.id = ?
        GROUP BY posts.id
        `,
        [this.lastID],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
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
        `
        SELECT
          posts.*,
          COUNT(likes.id) AS likeCount
        FROM posts
        LEFT JOIN likes ON posts.id = likes.post_id
        WHERE posts.id = ?
        GROUP BY posts.id
        `,
        [req.params.id],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(row);
        }
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
                broadcastSSE('postLikeUpdated', { id: Number(postId), likeCount: countRow.count });
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
                broadcastSSE('postLikeUpdated', { id: Number(postId), likeCount: countRow.count });
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



app.get('/posts/:id/comments', (req, res) => {
  const postId = req.params.id;

  db.all(
    `
    SELECT 
      comments.*,
      users.username
    FROM comments
    LEFT JOIN users ON comments.user_id = users.id
    WHERE post_id = ?
    ORDER BY createdAt ASC
    `,
    [postId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});


app.post('/posts/:id/comments', authMiddleware, (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Empty comment' });
  }

  db.run(
    `
    INSERT INTO comments (post_id, user_id, content, updatedAt)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [postId, userId, content.trim()],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.get(
        `
        SELECT 
          comments.*,
          users.username
        FROM comments
        LEFT JOIN users ON comments.user_id = users.id
        WHERE comments.id = ?
        `,
        [this.lastID],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });

          res.status(201).json(row);
        }
      );
    }
  );
});


app.put('/comments/:id', authMiddleware, (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Empty comment' });
  }

  db.get(
    `SELECT * FROM comments WHERE id = ?`,
    [commentId],
    (err, comment) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!comment) return res.status(404).json({ error: 'Not found' });

      if (comment.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      db.run(
        `
        UPDATE comments
        SET content = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [content.trim(), commentId],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });

          db.get(
            `
            SELECT
              comments.*,
              users.username
            FROM comments
            LEFT JOIN users ON comments.user_id = users.id
            WHERE comments.id = ?
            `,
            [commentId],
            (err, row) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json(row);
            }
          );
        }
      );
    }
  );
});


app.delete('/comments/:id', authMiddleware, (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;

  db.get(
    `SELECT * FROM comments WHERE id = ?`,
    [commentId],
    (err, comment) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!comment) return res.status(404).json({ error: 'Not found' });

      // 只能刪自己的
      if (comment.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      db.run(
        `DELETE FROM comments WHERE id = ?`,
        [commentId],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });

          res.json({ message: 'Deleted' });
        }
      );
    }
  );
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
