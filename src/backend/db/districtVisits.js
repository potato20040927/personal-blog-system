const { promisify } = require('node:util');
const { openDatabase } = require('./connection');

const districtVisitSchema = [
  `
    CREATE TABLE IF NOT EXISTS district_visit_notes (
      district_id TEXT PRIMARY KEY NOT NULL,
      description TEXT NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS district_visit_photos (
      public_id TEXT PRIMARY KEY NOT NULL,
      district_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
];

const db = openDatabase({
  databaseUrl: process.env.DISTRICT_VISITS_DATABASE_URL,
  dbPath: process.env.DISTRICT_VISITS_DB_PATH || './district-visits.sqlite',
  sslMode: process.env.DISTRICT_VISITS_PGSSLMODE,
});

db.ready = db.dialect === 'postgres'
  ? db.execSequential(districtVisitSchema)
  : promisify(db.exec.bind(db))(districtVisitSchema.join(';\n'));

module.exports = db;
