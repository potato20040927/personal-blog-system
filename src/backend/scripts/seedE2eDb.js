const fs = require('fs');
const path = require('path');
const { promisify } = require('node:util');
const sqlite3 = require('sqlite3').verbose();
const { initializeSchema } = require('../db/schema');

const dbPath = process.env.DB_PATH || './db.e2e.sqlite';
const absoluteDbPath = path.resolve(__dirname, '..', dbPath);

if (!absoluteDbPath.includes('e2e')) {
  throw new Error(`Refusing to reset non-e2e database: ${absoluteDbPath}`);
}

if (fs.existsSync(absoluteDbPath)) {
  fs.unlinkSync(absoluteDbPath);
}

const db = new sqlite3.Database(absoluteDbPath);

async function seed() {
  const run = promisify(db.run.bind(db));
  const close = promisify(db.close.bind(db));

  try {
    await initializeSchema(db);
    await run(
      `
      INSERT INTO posts (title, content, category, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        'E2E 測試文章',
        '<p>這是一篇給端對端測試使用的文章內容。</p>',
        '日記',
        '2026-01-01T00:00:00Z',
        '2026-01-01T00:00:00Z',
      ]
    );
  } finally {
    await close();
  }

  console.log(`Seeded E2E database at ${absoluteDbPath}`);
}

seed().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
