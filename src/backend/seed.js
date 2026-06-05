require('dotenv').config();

const bcrypt = require('bcrypt');
const db = require('./db');

async function seedAdmin() {
  await db.ready;

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error('Missing ADMIN_USERNAME or ADMIN_PASSWORD in .env');
    db.close();
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const sql =
    db.dialect === 'postgres'
      ? `
        INSERT INTO users (username, password_hash, role)
        VALUES (?, ?, 'admin')
        ON CONFLICT (username) DO NOTHING
      `
      : `
        INSERT OR IGNORE INTO users (username, password_hash, role)
        VALUES (?, ?, 'admin')
      `;

  db.run(
    sql,
    [username, hash],
    (err) => {
      if (err) console.error(err);
      else console.log('Admin seeded');
      db.close();
    }
  );
}

seedAdmin();
