# Personal Blog System (Front-end) (React + TypeScript + Vite)

This is a personal blog system built with **React + TypeScript + Vite**, supporting article creation, editing, deletion, and categorization, along with basic admin management features.

---

## Features

- Article list with category filtering
- Article detail page with optimized reading layout
- Rich text editor (ReactQuill)
- Image upload via Cloudinary
- Admin authorization (create / edit / delete posts)
- Global state management using Context API
- Clean and centered reading UI layout
- Unit testing with Vitest

---

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router DOM
- Context API
- ReactQuill
- Cloudinary (image upload service)
- Vitest + Testing Library

---

## Project Structure

```bash
src/
├── api/              # API requests
├── components/       # Reusable components (Header, PostCard, Layout)
├── pages/            # Pages (PostList, PostDetail, NewPostPage)
├── context/          # AuthContext
├── App.tsx
└── main.tsx
```

---

## Frontend Setup

### 1. Clone Repository

```bash
git clone https://github.com/potato20040927/personal-blog-system.git
cd src/frontend
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
