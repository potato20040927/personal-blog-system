# Personal Blog System Frontend

This frontend is built with **React**, **TypeScript**, and **Vite**. It provides the user interface for browsing posts, authentication, post management, likes, nested comments, benchmarks, and automated tests.

---

## Features

- Homepage post list
- Post detail page
- Admin-only post creation, editing, and deletion
- Login and registration pages
- JWT-based frontend auth state with `AuthContext`
- Like button with real-time updates through SSE
- Nested comment UI with Dcard-style floor labels such as `B1` and `B1-1`
- Comment creation, editing, deletion, reply, expand/collapse, and reference highlighting
- Category filtering
- Keyword search using a bigram index
- Time-based sorting using indexed post structures
- Like-based Top-K sorting using a heap manager
- Benchmark page for comparing optimized and baseline algorithms
- Unit and integration tests with Vitest and Testing Library
- End-to-end tests with Playwright

---

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router DOM
- ReactQuill
- React Icons
- Context API
- Vitest
- Testing Library
- Playwright

---

## Project Structure

```bash
frontend/
├── e2e/
│   └── blog.spec.ts                  # Playwright end-to-end tests
├── public/
│   └── potato.jpg
├── src/
│   ├── __tests__/                    # Vitest unit and integration tests
│   │   ├── benchmark/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── test-utils/
│   │   └── utils/
│   ├── api/
│   │   ├── client.ts                 # Shared API client
│   │   ├── comments_api.ts           # Comment API functions
│   │   ├── config.ts                 # API base URL
│   │   └── posts.ts                  # Post and like API functions
│   ├── benchmark/
│   │   ├── runBenchmark.ts
│   │   ├── runCommentLookupBenchmark.ts
│   │   ├── runTopKBenchmark.ts
│   │   └── searchBenchmark.ts
│   ├── components/
│   │   ├── CommentForm.tsx
│   │   ├── CommentSection.tsx
│   │   ├── Header.tsx
│   │   ├── Layout.tsx
│   │   └── PostCard.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   └── useComments.ts
│   ├── pages/
│   │   ├── BenchmarkPage.tsx
│   │   ├── EditPostPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── NewPostPage.tsx
│   │   ├── PostDetail.tsx
│   │   ├── PostList.tsx
│   │   └── RegisterPage.tsx
│   ├── types/
│   │   ├── comment.ts
│   │   └── post.ts
│   ├── utils/
│   │   ├── PostBST.ts
│   │   ├── PostIndexManager.ts
│   │   ├── TopKHeapManager.ts
│   │   ├── bigramIndex.ts
│   │   └── commentIndex.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── setupTests.ts
├── playwright.config.ts
├── vite.config.ts
├── package.json
└── README.md
```

Generated Playwright output is ignored by Git:

```bash
playwright-report/
test-results/
```

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd src/frontend
npm install
```

### 2. Environment Variables

Create a `.env` file in `src/frontend` if the backend does not run on the default URL.

```bash
VITE_API_URL=http://localhost:8000
```

If this variable is not provided, the frontend defaults to:

```bash
http://localhost:8000
```

### 3. Start Development Server

```bash
npm run dev
```

The frontend runs at:

```bash
http://localhost:5173
```

---

## Available Scripts

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Unit and Integration Tests

```bash
npm test -- --run
```

or:

```bash
npm run test:run
```

### E2E Tests

```bash
npm run test:e2e
```

Playwright automatically starts the backend and frontend through `playwright.config.ts`. It also seeds a separate E2E database through the backend script:

```bash
cd ../backend
npm run seed:e2e
```

### E2E UI Mode

```bash
npm run test:e2e:ui
```

---

## Benchmark Page

The frontend includes a benchmark page at:

```bash
http://localhost:5173/benchmark
```

It compares:

- Linear search versus bigram index search
- Array sorting versus indexed post ordering
- Full re-sort per like versus Top-K heap update
- `Array.find` versus `Map.get` for comment lookup
- `Array.map` update versus `Map.set` update for comment updates

These benchmarks demonstrate how data structures improve real UI features such as search, sorting, like ranking, and comment management.
