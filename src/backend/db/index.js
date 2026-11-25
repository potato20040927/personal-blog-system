const { openDatabase } = require('./connection');
const { initializeSchema } = require('./schema');

const db = openDatabase({
  databaseUrl: process.env.DATABASE_URL,
  dbPath: process.env.DB_PATH || './db.sqlite',
});

db.ready = initializeSchema(db);

module.exports = db;
