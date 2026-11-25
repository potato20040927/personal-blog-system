const { promisify } = require('node:util');

function initializeSchema(db) {
  if (db.dialect === 'postgres') {
    return initializePostgresSchema(db);
  }

  return initializeSqliteSchema(db);
}

async function initializeSqliteSchema(db) {
  const exec = promisify(db.exec.bind(db));
  const all = promisify(db.all.bind(db));

  await exec('BEGIN IMMEDIATE');
  try {
    await exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        district_ids TEXT NOT NULL DEFAULT '[]',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      );

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
      );
    `);

    const posts = await all('PRAGMA table_info(posts)');
    if (!posts.some((column) => column.name === 'district_ids')) {
      await exec("ALTER TABLE posts ADD COLUMN district_ids TEXT NOT NULL DEFAULT '[]'");
    }

    const users = await all('PRAGMA table_info(users)');
    if (!users.some((column) => column.name === 'email')) {
      await exec(`
        ALTER TABLE users ADD COLUMN email TEXT;
        CREATE UNIQUE INDEX idx_users_email ON users(email);
      `);
    }

    await migrateSqliteComments(exec, all);
    await exec(`
      CREATE INDEX IF NOT EXISTS idx_comments_post_parent_created
      ON comments (post_id, parent_comment_id, createdAt, id);

      CREATE INDEX IF NOT EXISTS idx_comments_reply_to
      ON comments (reply_to_comment_id);
    `);
    await exec('COMMIT');
  } catch (error) {
    await exec('ROLLBACK').catch(() => {});
    throw error;
  }
}

function initializePostgresSchema(db) {
  return db.execSequential([
    `
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        district_ids TEXT NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,
    `
      ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS district_ids TEXT NOT NULL DEFAULT '[]'
    `,
    `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,
    `
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email TEXT UNIQUE
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

async function migrateSqliteComments(exec, all) {
  const columns = new Set((await all('PRAGMA table_info(comments)')).map((column) => column.name));

  if (!columns.has('updatedAt')) {
    await exec(`
      ALTER TABLE comments ADD COLUMN updatedAt DATETIME;
      UPDATE comments SET updatedAt = createdAt WHERE updatedAt IS NULL;
    `);
  }

  if (!columns.has('parent_comment_id')) {
    await exec('ALTER TABLE comments ADD COLUMN parent_comment_id INTEGER DEFAULT NULL');
  }

  if (!columns.has('reply_to_comment_id')) {
    await exec(`
      ALTER TABLE comments ADD COLUMN reply_to_comment_id INTEGER DEFAULT NULL;
      UPDATE comments SET reply_to_comment_id = parent_comment_id
      WHERE parent_comment_id IS NOT NULL AND reply_to_comment_id IS NULL;
    `);
  }

  if (!columns.has('deletedAt')) {
    await exec('ALTER TABLE comments ADD COLUMN deletedAt DATETIME DEFAULT NULL');
  }
}

module.exports = {
  initializeSchema,
};
