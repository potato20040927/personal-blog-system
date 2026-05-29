import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command:
        'npm --prefix ../backend run seed:e2e && cd ../backend && DB_PATH=./db.e2e.sqlite PORT=8000 node -e "require(\'./server\'); setInterval(() => {}, 1000)"',
      url: 'http://127.0.0.1:8000/posts',
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command:
        'VITE_API_URL=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1 --port 5173',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
