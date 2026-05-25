import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import HomePage from './HomePage';
import { PostsContext } from '../components/Layout';

// mock Auth
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'admin' },
  }),
}));

// mock navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockPosts = [
  {
    id: 1,
    title: '今天 天氣很好',
    content: 'abc',
    category: '日記',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 2,
    title: '旅遊記錄',
    content: '台北',
    category: '旅遊',
    createdAt: '2024-01-02',
    updatedAt: '2024-01-02',
  },
];

const mockContext = {
  posts: mockPosts,
  setPosts: vi.fn(),
  category: null,
  setCategory: vi.fn(),
  search: '',
  setSearch: vi.fn(),
  index: new Map(),
  setIndex: vi.fn(),
};

describe('HomePage', () => {
  it('renders posts without crashing', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );
  });

  it('filters by category correctly', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={{
          ...mockContext,
          category: '旅遊',
        } as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('旅遊記錄')).toBeDefined();
  });

  it('filters by search keyword', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={{
          ...mockContext,
          search: '天',
        } as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('今天 天氣很好')).toBeDefined();
  });

  it('applies sort correctly (updated-desc)', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={{
          ...mockContext,
          sortBy: 'updated-desc',
        } as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    const items = screen.getAllByText(/今天 天氣很好|旅遊記錄/);

    // 真正驗證順序（旅遊記錄比較新）
    expect(items[0].textContent).toBe('旅遊記錄');
    expect(items[1].textContent).toBe('今天 天氣很好');
  });

  it('applies search and sort together', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={{
          ...mockContext,
          search: '天',
          sortBy: 'updated-desc',
        } as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('今天 天氣很好')).toBeDefined();
  });

  it('handles empty search safely', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={{
          ...mockContext,
          search: '',
        } as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('今天 天氣很好')).toBeDefined();
    expect(screen.getByText('旅遊記錄')).toBeDefined();
  });
});