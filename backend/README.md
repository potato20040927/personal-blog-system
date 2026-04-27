# Personal Blog System (Back-end) (API)

這是一個使用 **Node.js + Express + SQLite** 建立的簡易部落格後端 API，提供文章管理、使用者登入與圖片刪除功能。

---

##  Features

- 文章 CRUD API（新增 / 讀取 / 修改 / 刪除）
- 簡易登入系統（mock users）
- SQLite 本地資料庫
- Cloudinary 圖片管理（刪文時同步刪圖）
- admin 權限控制
- RESTful API 設計
- CORS 支援前端串接

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
├── server.js      # 主伺服器
├── db.sqlite      # SQLite 資料庫
└── .env           # 環境變數
```


## 專案執行(後端)

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
