const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 8000;

require('dotenv').config();

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
});

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

app.get('/posts/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM posts WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '文章不存在' });
    res.json(row);
  });
});

app.post('/posts', (req, res) => {
  const { title, content, category, user } = req.body;

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: '只有 admin 可以新增文章' });
  }

  if (!title || !content || !category) {
    return res.status(400).json({ error: '缺少必要欄位' });
  }

  const sql = 'INSERT INTO posts (title, content, category) VALUES (?, ?, ?)';
  const params = [title, content, category];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });

    db.get(
      'SELECT * FROM posts WHERE id = ?',
      [this.lastID],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.status(201).json(row);
      }
    );
  });
});

app.put('/posts/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, category, user } = req.body;

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: '只有 admin 可以修改文章' });
  }

  const sql = `
    UPDATE posts
    SET
      title = ?,
      content = ?,
      category = ?,
      updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  const params = [title, content, category, id];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });

    if (this.changes === 0) {
      return res.status(404).json({ error: '文章不存在' });
    }

    db.get(
      'SELECT * FROM posts WHERE id = ?',
      [id],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json(row);
      }
    );
  });
});

app.post('/posts/:id/delete', (req, res) => {
  const { id } = req.params;
  const { user } = req.body;

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: '只有 admin 可以刪除文章' });
  }

  db.get('SELECT * FROM posts WHERE id = ?', [id], async (err, post) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!post) return res.status(404).json({ error: '文章不存在' });

    const content = post.content;

    const regex = /https:\/\/res\.cloudinary\.com\/dkoc0xopr\/image\/upload\/v\d+\/([^"'\s]+)/g;
    let match;
    const publicIds = [];

    while ((match = regex.exec(content)) !== null) {
      publicIds.push(match[1].replace(/\.[a-zA-Z]+$/, ''));
    }

    for (const pid of publicIds) {
      try {
        await cloudinary.uploader.destroy(pid);
        console.log('已刪除圖片:', pid);
      } catch (err) {
        console.error('刪除圖片失敗:', pid, err);
      }
    }

    db.run('DELETE FROM posts WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: '文章與圖片已刪除' });
    });
  });
});

const users = [
  { username: 'admin', password: '1234', role: 'admin' },
  { username: 'user', password: '1234', role: 'user' },
];

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: '登入失敗' });

  res.json({ username: user.username, role: user.role, isLoggedIn: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});