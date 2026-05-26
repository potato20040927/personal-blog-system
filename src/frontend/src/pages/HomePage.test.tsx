import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import HomePage from './HomePage';
import { PostsContext } from '../components/Layout';
import { buildBigramIndex } from '../utils/bigramIndex'; // 1. 匯入建索引工具

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'admin' },
  }),
}));

// Mock useNavigate
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
    title: '第一篇舊文章',
    content: '這是較舊的內容',
    category: '日記',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  },
  {
    id: 2,
    title: '最新旅遊記錄',
    content: '這是較新的內容',
    category: '旅遊',
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-01T10:00:00Z',
  },
];

// 2. 建立真實的 Bigram Index 供測試使用
const mockIndex = buildBigramIndex(mockPosts);

const mockContextBase = {
  posts: mockPosts,
  setPosts: vi.fn(),
  category: null,
  setCategory: vi.fn(),
  search: '',
  setSearch: vi.fn(),
  index: mockIndex,
  setIndex: vi.fn(),
  sortBy: 'created-desc',
};

describe('HomePage (AVL Tree Version)', () => {
  it('可以正常渲染文章列表', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContextBase as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByText('最新旅遊記錄')).toBeDefined();
    expect(screen.getByText('第一篇舊文章')).toBeDefined();
  });

  it('分類過濾邏輯正確', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={{
          ...mockContextBase,
          category: '旅遊',
        } as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('最新旅遊記錄')).toBeDefined();
    expect(screen.queryByText('第一篇舊文章')).toBeNull();
  });

  it('搜尋功能（Bigram/Linear）邏輯正確', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={{
          ...mockContextBase,
          search: '旅遊',
        } as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('最新旅遊記錄')).toBeDefined();
    expect(screen.queryByText('第一篇舊文章')).toBeNull();
  });

  it('驗證 AVL Tree 排序功能 (created-desc)', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={{
          ...mockContextBase,
          sortBy: 'created-desc',
        } as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    const items = screen.getAllByRole('heading'); 
    expect(items[0].textContent).toMatch(/最新旅遊記錄/);
    expect(items[1].textContent).toMatch(/第一篇舊文章/);
  });

  it('驗證 AVL Tree 反向排序功能 (created-asc)', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={{
          ...mockContextBase,
          sortBy: 'created-asc',
        } as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    const items = screen.getAllByRole('heading');
    expect(items[0].textContent).toMatch(/第一篇舊文章/);
    expect(items[1].textContent).toMatch(/最新旅遊記錄/);
  });

  it('同時應用搜尋與排序', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={{
          ...mockContextBase,
          search: '內容',
          sortBy: 'created-asc',
        } as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    const items = screen.getAllByRole('heading');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toMatch(/第一篇舊文章/);
  });

  it('當資料為空時，不應崩潰', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={{
          ...mockContextBase,
          posts: [],
          index: new Map(),
        } as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );
    
    const items = screen.queryAllByRole('article');
    expect(items.length).toBe(0);
  });
});