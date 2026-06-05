function initializeSchema(db) {
  if (db.dialect === 'postgres') {
    return initializePostgresSchema(db);
  }

  return initializeSqliteSchema(db);
}

function initializeSqliteSchema(db) {
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
        parent_comment_id INTEGER DEFAULT NULL,
        reply_to_comment_id INTEGER DEFAULT NULL,
        content TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        deletedAt DATETIME DEFAULT NULL
      )
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_comments_post_parent_created
      ON comments (post_id, parent_comment_id, createdAt, id)
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_comments_reply_to
      ON comments (reply_to_comment_id)
    `);

    migrateCommentsTable(db);
  });

  return Promise.resolve();
}

function initializePostgresSchema(db) {
  return db.execSequential([
    `
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, post_id)
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_comment_id INTEGER DEFAULT NULL REFERENCES comments(id) ON DELETE SET NULL,
        reply_to_comment_id INTEGER DEFAULT NULL REFERENCES comments(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ DEFAULT NULL
      )
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_comments_post_parent_created
      ON comments (post_id, parent_comment_id, created_at, id)
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_comments_reply_to
      ON comments (reply_to_comment_id)
    `,
  ]);
}

function migrateCommentsTable(db) {
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

    const hasParentId = columns.some(
      (column) => column.name === 'parent_comment_id'
    );

    if (!hasParentId) {
      db.run(`
        ALTER TABLE comments
        ADD COLUMN parent_comment_id INTEGER DEFAULT NULL
      `);
    }

    const hasReplyToId = columns.some(
      (column) => column.name === 'reply_to_comment_id'
    );

    if (!hasReplyToId) {
      db.run(
        `
        ALTER TABLE comments
        ADD COLUMN reply_to_comment_id INTEGER DEFAULT NULL
        `,
        (alterErr) => {
          if (alterErr) {
            console.error('無法新增 comments.reply_to_comment_id 欄位', alterErr.message);
            return;
          }

          db.run(`
            UPDATE comments
            SET reply_to_comment_id = parent_comment_id
            WHERE parent_comment_id IS NOT NULL
            AND reply_to_comment_id IS NULL
          `);
        }
      );
    }

    const hasDeletedAt = columns.some((column) => column.name === 'deletedAt');
    if (!hasDeletedAt) {
      db.run(`ALTER TABLE comments ADD COLUMN deletedAt DATETIME DEFAULT NULL`);
    }
  });
}

module.exports = {
  initializeSchema,
};
