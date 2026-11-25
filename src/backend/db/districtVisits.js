const { promisify } = require('node:util');
const { openDatabase } = require('./connection');
const blogDb = require('./index');

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

const databaseUrl = process.env.DISTRICT_VISITS_DATABASE_URL;
const db = databaseUrl || blogDb.dialect !== 'postgres'
  ? openDatabase({
      databaseUrl,
      dbPath: process.env.DISTRICT_VISITS_DB_PATH || './district-visits.sqlite',
      sslMode: process.env.DISTRICT_VISITS_PGSSLMODE,
    })
  : blogDb;

async function initializeDistrictVisits() {
  if (db.dialect !== 'postgres') {
    const exec = promisify(db.exec.bind(db));
    await exec(districtVisitSchema.join(';\n'));
    return;
  }

  if (db === blogDb) await blogDb.ready;

  const statements = [
    ...districtVisitSchema,
    'ALTER TABLE district_visit_notes ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE district_visit_photos ENABLE ROW LEVEL SECURITY',
    'REVOKE ALL ON TABLE district_visit_notes, district_visit_photos FROM PUBLIC',
    `
      DO $$
      DECLARE api_role text;
      BEGIN
        FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
          EXECUTE format('REVOKE ALL ON TABLE district_visit_notes, district_visit_photos FROM %I', api_role);
        END LOOP;
      END
      $$;
    `,
  ];
  await db.transaction(statements.map((sql) => ({ sql })));
}

module.exports = { db, ready: initializeDistrictVisits() };
