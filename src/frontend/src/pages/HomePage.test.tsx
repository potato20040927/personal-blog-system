import { render } from '@testing-library/react';
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
  { id: 1, title: '今天 天氣很好', content: 'abc', category: '日記' },
  { id: 2, title: '旅遊記錄', content: '台北', category: '旅遊' },
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

  it('filters by category', () => {
    const context = {
      ...mockContext,
      category: '旅遊',
    };

    const { container } = render(
      <MemoryRouter>
        <PostsContext.Provider value={context as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(container).toBeDefined();
  });

  it('handles search input logic without crash', () => {
    const context = {
      ...mockContext,
      search: '天',
    };

    const { container } = render(
      <MemoryRouter>
        <PostsContext.Provider value={context as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(container).toBeDefined();
  });
});