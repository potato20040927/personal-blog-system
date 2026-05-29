const express = require('express');
const jwt = require('jsonwebtoken');

function createPostRoutes({
  adminOnly,
  authMiddleware,
  broadcastSSE,
  cloudinary,
  db,
  jwtSecret,
}) {
  const router = express.Router();

  router.get('/', (req, res) => {
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

  router.get('/:id', (req, res) => {
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

  router.post('/', authMiddleware, adminOnly, (req, res) => {
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

  router.put('/:id', authMiddleware, adminOnly, (req, res) => {
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

  router.post('/:id/delete', authMiddleware, adminOnly, (req, res) => {
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

  router.post('/:id/like', authMiddleware, (req, res) => {
    const userId = req.user.id;
    const postId = req.params.id;

    db.get(
      `SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?`,
      [userId, postId],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
          db.run(
            `DELETE FROM likes WHERE user_id = ? AND post_id = ?`,
            [userId, postId],
            function (err) {
              if (err) return res.status(500).json({ error: err.message });

              sendLikeStatus(res, postId, false);
            }
          );
        } else {
          db.run(
            `INSERT INTO likes (user_id, post_id) VALUES (?, ?)`,
            [userId, postId],
            function (err) {
              if (err) return res.status(500).json({ error: err.message });

              sendLikeStatus(res, postId, true);
            }
          );
        }
      }
    );
  });

  router.get('/:id/like-status', (req, res) => {
    const postId = req.params.id;

    const authHeader = req.headers.authorization;
    let userId = null;

    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, jwtSecret);
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

  function sendLikeStatus(res, postId, liked) {
    db.get(
      `SELECT COUNT(*) as count FROM likes WHERE post_id = ?`,
      [postId],
      (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          liked,
          count: countRow.count
        });
        broadcastSSE('postLikeUpdated', { id: Number(postId), likeCount: countRow.count });
      }
    );
  }

  return router;
}

module.exports = createPostRoutes;
