require('dotenv').config();

const bcrypt = require('bcrypt');
const db = require('../db');

async function resetAdmin() {
  await db.ready;

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('Missing ADMIN_USERNAME or ADMIN_PASSWORD in .env');
  }

  const hash = await bcrypt.hash(password, 10);

  const existingUsernameOwner = await getUserByUsername(username);
  const existingAdmin = await getFirstAdmin();

  if (
    existingUsernameOwner &&
    existingAdmin &&
    existingUsernameOwner.id !== existingAdmin.id
  ) {
    throw new Error('ADMIN_USERNAME is already used by another account');
  }

  if (existingAdmin) {
    await runStatement(
      `
      UPDATE users
      SET username = ?, password_hash = ?, role = 'admin'
      WHERE id = ?
      `,
      [username, hash, existingAdmin.id]
    );
    console.log('Admin account updated');
    return;
  }

  await runStatement(
    `
    INSERT INTO users (username, password_hash, role)
    VALUES (?, ?, 'admin')
    `,
    [username, hash]
  );
  console.log('Admin account created');
}

function getFirstAdmin() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, username FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`,
      [],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(row);
      }
    );
  });
}

function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, username FROM users WHERE username = ?`,
      [username],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(row);
      }
    );
  });
}

function runStatement(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(this);
    });
  });
}

resetAdmin()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
  });
