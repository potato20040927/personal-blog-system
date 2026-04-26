# Personal Blog System (Front-end) (React + TypeScript + Vite)

這是一個使用 React + TypeScript + Vite 開發的個人部落格系統，支援文章新增、編輯、刪除與分類功能，並具備基本後台管理能力。

---

## 專案特色

- 文章列表與分類瀏覽
- 文章詳細頁（閱讀優化版面）
- 富文字編輯器（ReactQuill）
- 圖片上傳（Cloudinary）
- Admin 權限控制（新增 / 編輯 / 刪除）
- Context API 全域狀態管理
- 基本 UI 排版優化（置中閱讀版面）
- 使用 Vitest 進行單元測試

---

## 技術架構

- React 18
- TypeScript
- Vite
- React Router DOM
- Context API
- ReactQuill
- Cloudinary (圖片上傳)
- Vitest + Testing Library

---

## 專案結構

```bash
src/
├── api/              # API 請求
├── components/       # 可重用元件（Header, PostCard, Layout）
├── pages/            # 頁面（PostList, PostDetail, NewPostPage）
├── context/          # AuthContext
├── App.tsx
└── main.tsx
```

---

## 專案執行(前端)

### 1. Clone Repository

```bash
git clone https://github.com/potato20040927/personal-blog-system.git
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open in Browser
```bash
http://localhost:5173
```

### 5. Run Tests
```bash
npm run test
```
