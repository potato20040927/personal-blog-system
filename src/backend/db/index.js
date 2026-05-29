const sqlite3 = require('sqlite3').verbose();
const { initializeSchema } = require('./schema');

const db = new sqlite3.Database('./db.sqlite', (err) => {
  if (err) {
    console.error('無法開啟資料庫', err.message);
  } else {
    console.log('已連線到 SQLite 資料庫');
  }
});

initializeSchema(db);

module.exports = db;
