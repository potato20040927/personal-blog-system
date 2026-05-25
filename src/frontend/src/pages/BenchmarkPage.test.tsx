import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BenchmarkPage from './BenchmarkPage';
import { PostsContext } from '../components/Layout';

// mock runBenchmark
vi.mock('../benchmark/runBenchmark', () => ({
  runBenchmark: vi.fn(() => ({
    linearTime: 1.2,
    bigramTime: 0.3,
    speedup: 4,
    totalPosts: 100,
    totalBigrams: 200,
    bigramResults: [
      { id: 1, title: 'Test Post 1', content: 'Hello' },
      { id: 2, title: 'Test Post 2', content: 'World' },
    ],
  })),
}));

const mockContext = {
  posts: [
    { id: 1, title: 'Test Post 1', content: 'Hello' },
    { id: 2, title: 'Test Post 2', content: 'World' },
  ],
  setPosts: vi.fn(),
  category: '',
  setCategory: vi.fn(),
  search: '',
  setSearch: vi.fn(),
  index: new Map(),
  setIndex: vi.fn(),
};

describe('BenchmarkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders benchmark UI correctly', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext as any}>
          <BenchmarkPage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('Benchmark Search')).toBeDefined();
    expect(screen.getByText('Run Benchmark')).toBeDefined();
    expect(screen.getByPlaceholderText(/輸入搜尋關鍵字/)).toBeDefined();
  });

  it('shows result after clicking run', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext as any}>
          <BenchmarkPage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/輸入搜尋關鍵字/);
    const button = screen.getByText('Run Benchmark');

    fireEvent.change(input, { target: { value: '天' } });
    fireEvent.click(button);

    expect(screen.getByText(/Linear Search:/)).toBeDefined();
    expect(screen.getByText(/Bigram Search:/)).toBeDefined();
    expect(screen.getByText(/Speedup:/)).toBeDefined();
    expect(screen.getByText(/Found Posts:/)).toBeDefined();
    expect(screen.getByText(/Matched Articles/)).toBeDefined();
  });

  it('does not run when query is empty', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext as any}>
          <BenchmarkPage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    const button = screen.getByText('Run Benchmark');
    fireEvent.click(button);

    // result 不應該出現
    expect(screen.queryByText(/Linear Search:/)).toBeNull();
  });
});