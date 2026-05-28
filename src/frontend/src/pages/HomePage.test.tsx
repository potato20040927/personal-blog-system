import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from './HomePage';
import { PostsContext } from '../components/Layout';
import { buildBigramIndex } from '../utils/bigramIndex';
import { TopKHeapManager } from '../utils/TopKHeapManager';
import type { Post } from '../components/PostCard';

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

  it('likes-desc 只顯示目前資料中按讚數最高的前 10 篇', async () => {
    const posts = Array.from({ length: 11 }, (_, index) => {
      const id = index + 1;
      return {
        id,
        title: `熱門文章 ${id}`,
        content: `content ${id}`,
        category: '日記',
        createdAt: `2024-01-${String(id).padStart(2, '0')}T10:00:00Z`,
        updatedAt: `2024-01-${String(id).padStart(2, '0')}T10:00:00Z`,
        likeCount: 120 - index * 10,
      };
    });

    const newPostWithoutLikeCount = {
      id: 12,
      title: '剛新增的 0 讚文章',
      content: 'new content',
      category: '日記',
      createdAt: '2024-02-01T10:00:00Z',
      updatedAt: '2024-02-01T10:00:00Z',
    };

    render(
      <MemoryRouter>
        <PostsContext.Provider value={{
          ...mockContextBase,
          posts: [...posts, newPostWithoutLikeCount],
          sortBy: 'likes-desc',
        } as any}>
          <HomePage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('heading')).toHaveLength(10);
    });

    const titles = screen.getAllByRole('heading').map((item) => item.textContent);
    expect(titles).toEqual([
      '熱門文章 1',
      '熱門文章 2',
      '熱門文章 3',
      '熱門文章 4',
      '熱門文章 5',
      '熱門文章 6',
      '熱門文章 7',
      '熱門文章 8',
      '熱門文章 9',
      '熱門文章 10',
    ]);
    expect(screen.queryByText('剛新增的 0 讚文章')).toBeNull();
    expect(screen.queryByText('熱門文章 11')).toBeNull();
  });
});

// ==========================================
// TopKHeapManager - Like Feature Tests
// ==========================================
describe('TopKHeapManager - 按讚功能單元測試', () => {
  let manager: TopKHeapManager;
  let posts: Post[] = [];

  beforeEach(() => {
    manager = new TopKHeapManager(5);
    posts = [
      {
        id: 1,
        title: 'Post 1',
        content: 'Content 1',
        category: 'tech',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        likeCount: 10,
      },
      {
        id: 2,
        title: 'Post 2',
        content: 'Content 2',
        category: 'tech',
        createdAt: '2024-01-02',
        updatedAt: '2024-01-02',
        likeCount: 20,
      },
      {
        id: 3,
        title: 'Post 3',
        content: 'Content 3',
        category: 'life',
        createdAt: '2024-01-03',
        updatedAt: '2024-01-03',
        likeCount: 15,
      },
      {
        id: 4,
        title: 'Post 4',
        content: 'Content 4',
        category: 'life',
        createdAt: '2024-01-04',
        updatedAt: '2024-01-04',
        likeCount: 5,
      },
      {
        id: 5,
        title: 'Post 5',
        content: 'Content 5',
        category: 'travel',
        createdAt: '2024-01-05',
        updatedAt: '2024-01-05',
        likeCount: 25,
      },
    ];
  });

  describe('初始化和構建', () => {
    it('應該能正確構建初始heap', () => {
      manager.build(posts);
      const topK = manager.getTopK();
      
      expect(topK).toHaveLength(5);
      const likeCounts = topK.map(p => p.likeCount);
      expect(likeCounts).toEqual([25, 20, 15, 10, 5]);
    });

    it('應該能正確獲取top 3', () => {
      const manager3 = new TopKHeapManager(3);
      manager3.build(posts);
      const topK = manager3.getTopK();
      
      expect(topK).toHaveLength(3);
      expect(topK[0].likeCount).toBe(25);
      expect(topK[1].likeCount).toBe(20);
      expect(topK[2].likeCount).toBe(15);
    });
  });

  describe('直接操作Heap (不rebuild)', () => {
    it('應該能通過update直接更新heap中的元素', () => {
      manager.build(posts);
      let topK = manager.getTopK();
      expect(topK[0].likeCount).toBe(25);

      const updatedPost1 = { ...posts[0], likeCount: 30 };
      manager.update(updatedPost1);

      topK = manager.getTopK();
      expect(topK[0].id).toBe(1);
      expect(topK[0].likeCount).toBe(30);
    });

    it('應該能在文章讚數下降後補進下一名文章', () => {
      const manager3 = new TopKHeapManager(3);
      manager3.build(posts);
      
      let topK = manager3.getTopK();
      expect(topK.map(p => p.id)).toEqual([5, 2, 3]);

      const updatedPost3 = { ...posts[2], likeCount: 1 };
      manager3.update(updatedPost3);

      topK = manager3.getTopK();
      expect(topK.map(p => p.id)).toEqual([5, 2, 1]);
      expect(topK.map(p => p.id)).not.toContain(3);
    });

    it('應該能通過update將新文章加入top K', () => {
      const manager3 = new TopKHeapManager(3);
      manager3.build(posts.slice(0, 3));

      let topK = manager3.getTopK();
      expect(topK.map(p => p.id)).not.toContain(4);

      const highLikePost = { ...posts[3], id: 4, likeCount: 25 };
      manager3.update(highLikePost);

      topK = manager3.getTopK();
      expect(topK.map(p => p.id)).toContain(4);
      expect(topK).toHaveLength(3);
    });

    it('應該能通過多次update正確維護heap結構', () => {
      manager.build(posts);

      const scenarios = [
        { id: 1, increment: 5 },
        { id: 3, increment: 10 },
        { id: 4, increment: 20 },
      ];

      for (const scenario of scenarios) {
        const post = posts.find(p => p.id === scenario.id)!;
        const updated = { ...post, likeCount: post.likeCount + scenario.increment };
        manager.update(updated);
        const idx = posts.findIndex(p => p.id === scenario.id);
        posts[idx] = updated;
      }

      const topK = manager.getTopK();
      const likeCounts = topK.map(p => p.likeCount);
      
      for (let i = 0; i < likeCounts.length - 1; i++) {
        expect(likeCounts[i]).toBeGreaterThanOrEqual(likeCounts[i + 1]);
      }
    });
  });

  describe('性能測試: Update vs Rebuild', () => {
    it('應該能在O(log K)時間內完成單個update', () => {
      manager.build(posts);
      
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        const post = posts[i % posts.length];
        const updated = { ...post, likeCount: Math.random() * 1000 };
        manager.update(updated);
      }
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('與SSE事件結合的場景模擬', () => {
    it('應該能正確處理SSE postLikeUpdated事件後的heap更新', () => {
      manager.build(posts);

      const ssePayload = { id: 2, likeCount: 50 };
      const updatedPost = posts.find(p => p.id === ssePayload.id);
      if (updatedPost) {
        const newPost = { ...updatedPost, likeCount: ssePayload.likeCount };
        manager.update(newPost);
      }

      const topK = manager.getTopK();
      expect(topK[0].id).toBe(2);
      expect(topK[0].likeCount).toBe(50);
    });

    it('應該能處理多個並發的SSE更新', () => {
      manager.build(posts);

      const updates = [
        { postId: 1, newCount: 40 },
        { postId: 3, newCount: 35 },
        { postId: 5, newCount: 28 },
        { postId: 4, newCount: 22 },
      ];

      for (const update of updates) {
        const post = posts.find(p => p.id === update.postId);
        if (post) {
          const newPost = { ...post, likeCount: update.newCount };
          manager.update(newPost);
        }
      }

      const topK = manager.getTopK();
      const likeCounts = topK.map(p => p.likeCount);

      for (let i = 0; i < likeCounts.length - 1; i++) {
        expect(likeCounts[i]).toBeGreaterThanOrEqual(likeCounts[i + 1]);
      }
    });
  });

  describe('邊界情況', () => {
    it('應該能處理缺少 likeCount 的新文章，並視為0讚', () => {
      const manager3 = new TopKHeapManager(3);
      manager3.build([
        { ...posts[0], likeCount: 30 },
        { ...posts[1], likeCount: 20 },
        { ...posts[2], likeCount: 10 },
        { ...posts[3], likeCount: 5 },
        {
          id: 99,
          title: 'New Post',
          content: 'New Content',
          category: 'life',
          createdAt: '2024-02-01',
          updatedAt: '2024-02-01',
        } as Post,
      ]);

      const topK = manager3.getTopK();

      expect(topK.map(p => p.id)).toEqual([1, 2, 3]);
      expect(topK.map(p => p.likeCount)).toEqual([30, 20, 10]);
    });

    it('應該能處理讚數為0的情況', () => {
      manager.build(posts);
      
      let topK = manager.getTopK();
      expect(topK).toHaveLength(5);

      const post = posts[3];
      const zeroLikePost = { ...post, likeCount: 0 };
      manager.update(zeroLikePost);

      topK = manager.getTopK();
      expect(topK).toHaveLength(5);
      expect(topK.at(-1)?.id).toBe(4);
      expect(topK.at(-1)?.likeCount).toBe(0);
    });

    it('應該能處理非常大的讚數', () => {
      manager.build(posts);
      
      const post = posts[0];
      const hugeLikePost = { ...post, likeCount: 999999 };
      manager.update(hugeLikePost);

      const topK = manager.getTopK();
      expect(topK[0].id).toBe(post.id);
      expect(topK[0].likeCount).toBe(999999);
    });

    it('應該能正確處理相同讚數的多個文章', () => {
      const sameLikePosts: Post[] = [
        { ...posts[0], likeCount: 50 },
        { ...posts[1], likeCount: 50 },
        { ...posts[2], likeCount: 50 },
      ];

      manager.build(sameLikePosts);
      const topK = manager.getTopK();

      expect(topK).toHaveLength(3);
      expect(topK.every(p => p.likeCount === 50)).toBe(true);
    });
  });
});
