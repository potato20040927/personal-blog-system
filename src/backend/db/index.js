const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const { initializeSchema } = require('./schema');

const databaseUrl = process.env.DATABASE_URL;
const dbPath = process.env.DB_PATH || './db.sqlite';

const db = databaseUrl ? createPostgresAdapter(databaseUrl) : createSqliteDb(dbPath);

db.ready = Promise.resolve(initializeSchema(db));

module.exports = db;

function createSqliteDb(path) {
  const sqliteDb = new sqlite3.Database(path, (err) => {
    if (err) {
      console.error('無法開啟 SQLite 資料庫', err.message);
    } else {
      console.log('已連線到 SQLite 資料庫');
    }
  });

  sqliteDb.dialect = 'sqlite';
  return sqliteDb;
}

function createPostgresAdapter(connectionString) {
  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  });

  pool.on('error', (err) => {
    console.error('Postgres connection error', err.message);
  });

  console.log('已設定 Postgres 資料庫連線');

  return {
    dialect: 'postgres',

    serialize(callback) {
      callback();
    },

    all(sql, params = [], callback) {
      runQuery(pool, sql, params)
        .then((result) => callback(null, result.rows.map(mapPostgresRow)))
        .catch((err) => callback(err));
    },

    get(sql, params = [], callback) {
      runQuery(pool, sql, params)
        .then((result) => callback(null, mapPostgresRow(result.rows[0])))
        .catch((err) => callback(err));
    },

    run(sql, params = [], callback = () => {}) {
      runQuery(pool, addReturningClause(sql), params)
        .then((result) => {
          const context = {
            changes: result.rowCount,
            lastID: result.rows[0]?.id,
          };
          callback.call(context, null);
        })
        .catch((err) => callback(err));
    },

    close(callback = () => {}) {
      pool.end().then(() => callback()).catch(callback);
    },

    async transaction(statements) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        for (const statement of statements) {
          const { text, values } = toPostgresQuery(statement.sql, statement.params || []);
          await client.query(text, values);
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },

    execSequential(statements) {
      return statements.reduce(
        (promise, statement) => promise.then(() => runQuery(pool, statement, [])),
        Promise.resolve()
      );
    },
  };
}

function runQuery(pool, sql, params) {
  const { text, values } = toPostgresQuery(sql, params);
  return pool.query(text, values);
}

function toPostgresQuery(sql, params) {
  let index = 0;
  const text = normalizePostgresSql(sql).replace(/\?/g, () => `$${++index}`);

  return {
    text,
    values: params,
  };
}

function normalizePostgresSql(sql) {
  return sql
    .replace(/\bcreatedAt\b/g, 'created_at')
    .replace(/\bupdatedAt\b/g, 'updated_at')
    .replace(/\bdeletedAt\b/g, 'deleted_at')
    .replace(/\bCURRENT_TIMESTAMP\b/g, 'NOW()');
}

function addReturningClause(sql) {
  if (/^\s*INSERT\s+INTO\s+(posts|comments)\b/i.test(sql) && !/\bRETURNING\b/i.test(sql)) {
    return `${sql.trim()} RETURNING id`;
  }

  return sql;
}

function mapPostgresRow(row) {
  if (!row) return row;

  return {
    ...row,
    ...(row.created_at !== undefined ? { createdAt: row.created_at } : {}),
    ...(row.updated_at !== undefined ? { updatedAt: row.updated_at } : {}),
    ...(row.deleted_at !== undefined ? { deletedAt: row.deleted_at } : {}),
    ...(row.likecount !== undefined ? { likeCount: Number(row.likecount) } : {}),
    ...(row.count !== undefined ? { count: Number(row.count) } : {}),
  };
}
