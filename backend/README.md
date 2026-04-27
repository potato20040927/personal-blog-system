# Personal Blog System (Back-end) (API)

This is a simple blog backend API built with **Node.js + Express + SQLite**, providing article management, user authentication, and image deletion functionality.

---

##  Features

- Article CRUD API (Create / Read / Update / Delete)
- Simple authentication system (mock users)
- SQLite local database
- Cloudinary image management (auto-delete images when posts are deleted)
- Admin permission control
- RESTful API design
- CORS enabled for frontend integration
- 
---

## Tech Stack

- Node.js
- Express
- SQLite3
- Cloudinary (https://cloudinary.com/)
- dotenv
- body-parser
- cors

---

## Project Structure

```bash
backend/
├── server.js      # Main server file
├── db.sqlite      # SQLite database
└── .env           # Environment variables
```


## Backend Setup

### 1. Clone Repository

```bash
git clone https://github.com/potato20040927/personal-blog-system.git
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables Setup
Before starting the server, you need to create a `.env` file in the backend root directory and configure your Cloudinary credentials.

You can obtain these credentials from your Cloudinary dashboard.

Create a `.env` file and add the following:

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Start Server
```bash
node server.js
```

### 4. Server Runs At
```bash
http://localhost:8000
```
