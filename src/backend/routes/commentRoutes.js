const express = require('express');

const COMMENT_SELECT = `
  SELECT 
    comments.*,
    users.username,
    reply_to_comments.parent_comment_id AS reply_to_parent_comment_id,
    reply_to_users.username AS reply_to_username
  FROM comments
  LEFT JOIN users ON comments.user_id = users.id
  LEFT JOIN comments AS reply_to_comments
    ON comments.reply_to_comment_id = reply_to_comments.id
  LEFT JOIN users AS reply_to_users
    ON reply_to_comments.user_id = reply_to_users.id
`;

function createCommentRoutes({ authMiddleware, broadcastSSE, db }) {
  const router = express.Router();

  router.get('/posts/:id/comments', (req, res) => {
    const postId = req.params.id;

    db.all(
      `
      ${COMMENT_SELECT}
      WHERE comments.post_id = ?
      ORDER BY
        COALESCE(comments.parent_comment_id, comments.id),
        CASE WHEN comments.parent_comment_id IS NULL THEN 0 ELSE 1 END,
        comments.createdAt ASC,
        comments.id ASC
      `,
      [postId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      }
    );
  });

  router.post('/posts/:id/comments', authMiddleware, (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const { content, parent_comment_id, reply_to_comment_id } = req.body;
    const replyTargetId = reply_to_comment_id || parent_comment_id || null;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Empty comment' });
    }

    if (!replyTargetId) {
      return insertComment(null, null);
    }

    db.get(
      `
      SELECT *
      FROM comments
      WHERE id = ?
      AND post_id = ?
      `,
      [replyTargetId, postId],
      (err, replyTarget) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!replyTarget) {
          return res.status(400).json({
            error: 'Invalid reply target',
          });
        }

        if (replyTarget.deletedAt) {
          return res.status(400).json({
            error: 'Cannot reply to deleted comment',
          });
        }

        const parentId = replyTarget.parent_comment_id || replyTarget.id;
        insertComment(parentId, replyTarget.id);
      }
    );

    function insertComment(parentId, replyToId) {
      db.run(
        `
        INSERT INTO comments (
          post_id,
          user_id,
          parent_comment_id,
          reply_to_comment_id,
          content,
          updatedAt
        )
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        [postId, userId, parentId, replyToId, content.trim()],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });

          getCommentById(db, this.lastID, res, (row) => {
            res.status(201).json(row);
            broadcastSSE('commentCreated', {
              postId: Number(postId),
              comment: row,
            });
          });
        }
      );
    }
  });

  router.put('/comments/:id', authMiddleware, (req, res) => {
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

        if (comment.deletedAt) {
          return res.status(400).json({ error: 'Cannot edit deleted comment' });
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

            getCommentById(db, commentId, res, (row) => {
              res.json(row);
              broadcastSSE('commentUpdated', {
                postId: Number(row.post_id),
                comment: row,
              });
            });
          }
        );
      }
    );
  });

  router.delete('/comments/:id', authMiddleware, (req, res) => {
    const commentId = req.params.id;
    const userId = req.user.id;

    db.get(
      `SELECT * FROM comments WHERE id = ?`,
      [commentId],
      (err, comment) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!comment) return res.status(404).json({ error: 'Not found' });

        if (comment.user_id !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        db.get(
          `
          SELECT COUNT(*) AS count
          FROM comments
          WHERE parent_comment_id = ?
          OR reply_to_comment_id = ?
          `,
          [commentId, commentId],
          (err, refRow) => {
            if (err) return res.status(500).json({ error: err.message });

            if (refRow.count > 0) {
              db.run(
                `
                UPDATE comments
                SET content = '[留言已刪除]',
                    updatedAt = CURRENT_TIMESTAMP,
                    deletedAt = CURRENT_TIMESTAMP
                WHERE id = ?
                `,
                [commentId],
                function (err) {
                  if (err) return res.status(500).json({ error: err.message });

                  getCommentById(db, commentId, res, (row) => {
                    res.json({ message: 'Deleted', softDeleted: true });
                    broadcastSSE('commentDeleted', {
                      postId: Number(row.post_id),
                      id: Number(commentId),
                      softDeleted: true,
                      comment: row,
                    });
                  });
                }
              );
              return;
            }

            db.run(
              `DELETE FROM comments WHERE id = ?`,
              [commentId],
              function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Deleted', softDeleted: false });
                broadcastSSE('commentDeleted', {
                  postId: Number(comment.post_id),
                  id: Number(commentId),
                  softDeleted: false,
                });
              }
            );
          }
        );
      }
    );
  });

  return router;
}

function getCommentById(db, commentId, res, onSuccess) {
  db.get(
    `
    ${COMMENT_SELECT}
    WHERE comments.id = ?
    `,
    [commentId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      onSuccess(row);
    }
  );
}

module.exports = createCommentRoutes;
