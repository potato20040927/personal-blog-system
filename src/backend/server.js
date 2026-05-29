const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cloudinary = require('cloudinary').v2;

require('dotenv').config();

const db = require('./db');
const createAuthRoutes = require('./routes/authRoutes');
const createCommentRoutes = require('./routes/commentRoutes');
const createPostRoutes = require('./routes/postRoutes');
const { adminOnly, createAuthMiddleware } = require('./middleware/auth');
const { broadcastSSE, registerSseRoute } = require('./realtime/sse');

const app = express();
const PORT = 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const authMiddleware = createAuthMiddleware(JWT_SECRET);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(cors());
app.use(bodyParser.json());

registerSseRoute(app);

app.use('/auth', createAuthRoutes({ db, jwtSecret: JWT_SECRET }));
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
