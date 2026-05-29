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
    totalPosts: 168,
    linearResults: [
      { id: 1, title: 'Test Post 1', content: 'Hello', category: 'News', createdAt: '2024-01-01' },
    ],
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

vi.mock('../benchmark/runTopKBenchmark', () => ({
  runTopKBenchmark: vi.fn(() => ({
    legacyTime: 10.0,
    heapTime: 1.0,
    speedup: 10.0,
    heapSize: 10,
    candidateSize: 90,
  })),
}));

vi.mock('../benchmark/runCommentLookupBenchmark', () => ({
  runCommentLookupBenchmark: vi.fn(() => ({
    commentCount: 500,
    lookupCount: 10000,
    updateCount: 5000,
    linearTime: 8.0,
    hashMapTime: 0.8,
    speedup: 10.0,
    arrayUpdateTime: 6.0,
    mapUpdateTime: 0.6,
    updateSpeedup: 10.0,
    foundCount: 10000,
  })),
}));

const mockContext = {
  posts: [
    {
      id: 1,
      title: 'Test Post 1',
      content: 'Hello',
      category: 'News',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      likeCount: 3,
    },
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
    expect(screen.getByText('3. Top-K Likes')).toBeDefined();
    expect(screen.getByText('4. Comment Lookup')).toBeDefined();
    expect(screen.getByText('5. Comment Update')).toBeDefined();
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

  it('執行 Top-K 按讚排序測試後應顯示 Full Re-sort 與 Heap Update 數據', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext as any}>
          <BenchmarkPage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    const topKButton = screen.getByText('Run Top-K');
    fireEvent.click(topKButton);

    expect(screen.getByText(/Full Re-sort \(1000 likes\):/)).toBeDefined();
    expect(screen.getByText(/Heap Update \(1000 likes\):/)).toBeDefined();
    expect(screen.getByText(/Top-K Heap Size:/)).toBeDefined();
    expect(screen.getByText(/Candidate Heap Size:/)).toBeDefined();
    expect(screen.getByText(/Speedup:/)).toBeDefined();
  });

  it('執行留言查找測試後應顯示 Array.find 與 Map.get 數據', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext as any}>
          <BenchmarkPage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Run Comment Lookup'));

    expect(screen.getAllByText(/Comments:/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Lookups:/)).toBeDefined();
    expect(screen.getByText(/Array\.find:/)).toBeDefined();
    expect(screen.getByText(/Map\.get:/)).toBeDefined();
    expect(screen.getByText(/Lookup Speedup:/)).toBeDefined();
  });

  it('執行留言更新測試後應顯示 Array.map 與 Map.set 數據', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext as any}>
          <BenchmarkPage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Run Comment Update'));

    expect(screen.getAllByText(/Comments:/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Updates:/)).toBeDefined();
    expect(screen.getByText(/Array\.map Update:/)).toBeDefined();
    expect(screen.getByText(/Map\.set Update:/)).toBeDefined();
    expect(screen.getByText(/Update Speedup:/)).toBeDefined();
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
