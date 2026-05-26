import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BenchmarkPage from './BenchmarkPage';
import { PostsContext } from '../components/Layout';

// 1. Mock 效能測試邏輯
vi.mock('../benchmark/runBenchmark', () => ({
  runBenchmark: vi.fn(() => ({
    linearTime: 1.2,
    bigramTime: 0.3,
    speedup: 4,
    bigramResults: [
      { id: 1, title: 'Test Post 1', content: 'Hello', category: 'News', createdAt: '2024-01-01' },
    ],
  })),
  runSortBenchmark: vi.fn(() => ({
    legacySortTime: 2.5,
    avlSortTime: 0.5,
    sortSpeedup: 5.0,
  })),
}));

const mockContext = {
  posts: [
    { id: 1, title: 'Test Post 1', content: 'Hello', category: 'News', createdAt: '2024-01-01' },
  ],
  index: new Map(),
  category: '',
  search: '',
  sortBy: 'created-desc',
};

describe('BenchmarkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應該正確渲染基準測試頁面的標題與區塊', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext as any}>
          <BenchmarkPage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('System Performance Benchmark')).toBeDefined();
    expect(screen.getByText('1. Search Performance')).toBeDefined();
    expect(screen.getByText('2. Sort Performance')).toBeDefined();
    expect(screen.getByPlaceholderText('關鍵字...')).toBeDefined();
  });

  it('執行搜尋測試後應顯示 Linear 與 Bigram 數據', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext as any}>
          <BenchmarkPage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('關鍵字...');
    const button = screen.getByRole('button', { name: 'Run' }); // 搜尋區塊的按鈕文字是 Run

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    expect(screen.getByText(/Linear:/)).toBeDefined();
    expect(screen.getByText(/Bigram Index:/)).toBeDefined();
    expect(screen.getByText(/Speedup:/)).toBeDefined();
    expect(screen.getByText(/Matched Articles/)).toBeDefined();
  });

  it('執行排序測試後應顯示 Array.sort 與 AVL Tree 數據', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext as any}>
          <BenchmarkPage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    const sortButton = screen.getByText('Run Sort Benchmark');
    fireEvent.click(sortButton);

    expect(screen.getByText(/Array\.sort \(Standard\):/)).toBeDefined();
    expect(screen.getByText(/AVL Tree \(Indexed\):/)).toBeDefined();
    expect(screen.getByText(/Speedup:/)).toBeDefined();
  });

  it('當輸入為空時點擊 Run 不應觸發搜尋', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext as any}>
          <BenchmarkPage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: 'Run' });
    fireEvent.click(button);

    expect(screen.queryByText(/Linear:/)).toBeNull();
  });
});