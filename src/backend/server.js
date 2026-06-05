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
const { adminOnly, createAuthMiddleware } = require('./middleware/auth');
const { broadcastSSE, registerSseRoute } = require('./realtime/sse');

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? undefined : 'dev_secret_key');
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_ORIGIN ||
  'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && !JWT_SECRET) {
  console.error('Missing JWT_SECRET in production');
  process.exit(1);
}

if (isProduction && !process.env.CORS_ORIGIN && !process.env.FRONTEND_ORIGIN) {
  console.error('Missing CORS_ORIGIN or FRONTEND_ORIGIN in production');
  process.exit(1);
}

const authMiddleware = createAuthMiddleware(JWT_SECRET);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
