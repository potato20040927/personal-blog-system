# Personal Blog System Backend

This backend provides the API layer for the personal blog system. It is built with **Node.js**, **Express**, and **SQLite**, and supports posts, authentication, likes, nested comments, Cloudinary image cleanup, and Server-Sent Events.

---

## Features

- User registration and login with JWT authentication
- Admin-only post creation, editing, and deletion
- Post listing and post detail APIs
- Like and unlike API with real-time SSE updates
- Nested comment APIs with a two-level reply model
- Comment creation, editing, deletion, and soft deletion
- SQLite schema initialization and lightweight migration logic
- Cloudinary image cleanup when deleting posts
- E2E test database seeding

---

## Tech Stack

- Node.js
- Express
- SQLite3
- bcrypt
- JSON Web Token
- Cloudinary
- dotenv
- cors
- helmet
- express-rate-limit
- body-parser

---

## Project Structure

```bash
backend/
├── db/
│   ├── index.js              # SQLite connection and schema initialization
│   └── schema.js             # Table creation, indexes, and migration helpers
├── middleware/
│   └── auth.js               # JWT authentication and admin authorization
├── realtime/
│   └── sse.js                # Server-Sent Events connection and broadcast logic
├── routes/
│   ├── authRoutes.js         # /auth/register and /auth/login
│   ├── commentRoutes.js      # Comment and nested reply APIs
│   └── postRoutes.js         # Posts, likes, and post management APIs
├── scripts/
│   └── seedE2eDb.js          # Seed script for Playwright E2E tests
├── server.js                 # Express app composition and server startup
├── seed.js                   # Local seed script
├── package.json
└── README.md
```

Generated local databases are ignored by Git:

```bash
db.sqlite
db.e2e.sqlite
```

---

## Backend Setup

### 1. Install Dependencies

```bash
cd src/backend
npm install
```

### 2. Environment Variables

Create a `.env` file in `src/backend` and add the following:

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret
ADMIN_USERNAME=your_admin_name
ADMIN_PASSWORD=your_admin_password
CORS_ORIGIN=http://localhost:5173
DB_PATH=./db.sqlite
DATABASE_URL=
PGSSLMODE=require
JSON_BODY_LIMIT=1mb
```

`JWT_SECRET` is optional during local development because the backend has a development fallback, but it is required when `NODE_ENV=production`.

When `NODE_ENV=production`, the backend also requires `CORS_ORIGIN` or `FRONTEND_ORIGIN`, `DATABASE_URL` or `DB_PATH`, and the Cloudinary credentials.

`ADMIN_USERNAME` and `ADMIN_PASSWORD` are used by `seed.js` to create a local admin account.

The backend also supports these runtime environment variables:

```bash
PORT=8000
DB_PATH=./db.sqlite
DATABASE_URL=
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
```

These are useful for E2E testing because Playwright can start the backend with a separate database:

```bash
DB_PATH=./db.e2e.sqlite PORT=8000 node server.js
```

### 3. Start the Server

```bash
npm start
```

The server runs at:

```bash
http://localhost:8000
```

Health check endpoint:

```bash
GET /health
```

---

## E2E Test Database

The backend includes a seed script for the frontend Playwright tests:

```bash
npm run seed:e2e
```

This creates and seeds:

```bash
db.e2e.sqlite
```

The seed script refuses to reset databases whose path does not include `e2e`, which helps avoid accidentally deleting a development database.

---

## Creating an Admin Account

Normal registration creates users with the `user` role by default. Admin permissions are required to create, edit, and delete posts.

For local development, create an admin account with the backend seed script.

First, set these values in `src/backend/.env`:

```bash
ADMIN_USERNAME=your_admin_name
ADMIN_PASSWORD=your_admin_password
```

Then run:

```bash
cd src/backend
node seed.js
```

The script inserts an admin user into the SQLite `users` table:

```sql
INSERT OR IGNORE INTO users (username, password_hash, role)
VALUES (?, ?, 'admin')
```

After running the seed script, start the backend and log in through the frontend using the configured admin username and password. The account will have permission to create, edit, and delete posts.

If the admin username already exists, `seed.js` uses `INSERT OR IGNORE`, so it will not overwrite the existing user's password or role.

---

## Main API Routes

### Auth

```bash
POST /auth/register
POST /auth/login
```

### Posts

```bash
GET    /posts
GET    /posts/:id
POST   /posts
PUT    /posts/:id
POST   /posts/:id/delete
```

Creating, updating, and deleting posts require an authenticated admin user.

### Likes

```bash
POST /posts/:id/like
GET  /posts/:id/like-status
```

### Comments

```bash
GET    /posts/:id/comments
POST   /posts/:id/comments
PUT    /comments/:id
DELETE /comments/:id
```

Comment replies use `reply_to_comment_id`. The backend resolves the root parent comment so replies remain visually two levels deep.

### Server-Sent Events

```bash
GET /events
```

Current SSE event types:

```bash
postLikeUpdated
commentCreated
commentUpdated
commentDeleted
```
