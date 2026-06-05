const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cloudinary = require('cloudinary').v2;
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

require('dotenv').config();

const db = require('./db');
const createAuthRoutes = require('./routes/authRoutes');
const createCommentRoutes = require('./routes/commentRoutes');
const createPostRoutes = require('./routes/postRoutes');
const createUploadRoutes = require('./routes/uploadRoutes');
const { adminOnly, createAuthMiddleware } = require('./middleware/auth');
const { broadcastSSE, registerSseRoute } = require('./realtime/sse');

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? undefined : 'dev_secret_key');
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_ORIGIN ||
  'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const missingProductionEnv = [
  ['JWT_SECRET', JWT_SECRET],
  ['CORS_ORIGIN or FRONTEND_ORIGIN', process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN],
  ['DATABASE_URL or DB_PATH', process.env.DATABASE_URL || process.env.DB_PATH],
  ['CLOUDINARY_CLOUD_NAME', cloudinaryCloudName],
  ['CLOUDINARY_API_KEY', process.env.CLOUDINARY_API_KEY],
  ['CLOUDINARY_API_SECRET', process.env.CLOUDINARY_API_SECRET],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (isProduction && missingProductionEnv.length > 0) {
  console.error(`Missing production environment variables: ${missingProductionEnv.join(', ')}`);
  process.exit(1);
}

const authMiddleware = createAuthMiddleware(JWT_SECRET, db);

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(bodyParser.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

registerSseRoute(app);

app.use(
  '/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  createAuthRoutes({ db, jwtSecret: JWT_SECRET })
);
app.use(
  '/posts',
  createPostRoutes({
    adminOnly,
    authMiddleware,
    broadcastSSE,
    cloudinaryCloudName,
    cloudinary,
    db,
    jwtSecret: JWT_SECRET,
  })
);
app.use(
  createCommentRoutes({
    authMiddleware,
    broadcastSSE,
    db,
  })
);
app.use(
  '/uploads',
  createUploadRoutes({
    adminOnly,
    authMiddleware,
    cloudinary,
  })
);

db.ready
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database', err.message);
    process.exit(1);
  });
