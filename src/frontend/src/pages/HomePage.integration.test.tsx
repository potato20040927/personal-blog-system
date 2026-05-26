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

const baseContext = {
  posts: mockPosts,
  setPosts: vi.fn(),
  category: null,
  setCategory: vi.fn(),
  search: '',
  setSearch: vi.fn(),
  index: new Map(),
  setIndex: vi.fn(),
  sortBy: 'updated-desc',
  setSortBy: vi.fn(),
};

describe('HomePage Integration Tests', () => {
  it('renders all posts', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={baseContext as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('今天 天氣很好')).toBeTruthy();
    expect(screen.getByText('旅遊記錄')).toBeTruthy();
  });

  it('filters by search only', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider
          value={{
            ...baseContext,
            search: '天',
          } as any}
        >
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('今天 天氣很好')).toBeTruthy();
  });

  it('category + search interaction', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider
          value={{
            ...baseContext,
            category: '旅遊',
            search: '旅',
          } as any}
        >
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('旅遊記錄')).toBeTruthy();
  });
});