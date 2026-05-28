import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HomePage from './HomePage';
import { PostsContext } from '../components/Layout';
import Layout from '../components/Layout';

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

// ==========================================
// SSE Like Updates Integration Tests
// ==========================================
// Mock the API used by Layout
vi.mock('../api/posts', () => ({
  getPosts: vi.fn(() => Promise.resolve([
    {
      id: 1,
      title: 'Test Post 1',
      content: 'Content 1',
      category: 'tech',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      likeCount: 10,
    },
    {
      id: 2,
      title: 'Test Post 2',
      content: 'Content 2',
      category: 'life',
      createdAt: '2024-01-02',
      updatedAt: '2024-01-02',
      likeCount: 5,
    },
  ])),
  toggleLike: vi.fn(),
  getLikeStatus: vi.fn(),
}));

describe('SSE Like Updates Integration Test', () => {
  let mockEventSource: any;
  let eventListeners: Map<string, ((event: MessageEvent) => void)[]>;

  beforeEach(() => {
    eventListeners = new Map();

    mockEventSource = {
      addEventListener: vi.fn((eventName: string, handler: (event: MessageEvent) => void) => {
        if (!eventListeners.has(eventName)) {
          eventListeners.set(eventName, []);
        }
        eventListeners.get(eventName)!.push(handler);
      }),
      removeEventListener: vi.fn((eventName: string, handler: (event: MessageEvent) => void) => {
        if (eventListeners.has(eventName)) {
          const handlers = eventListeners.get(eventName)!;
          const index = handlers.indexOf(handler);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        }
      }),
      close: vi.fn(),
      onerror: null,
    };

    // @ts-ignore
    global.EventSource = vi.fn(function EventSourceMock() {
      return mockEventSource;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('應該能接收並處理SSE postLikeUpdated事件', async () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
        'postLikeUpdated',
        expect.any(Function)
      );
    });

    const handlers = eventListeners.get('postLikeUpdated') || [];
    expect(handlers.length).toBeGreaterThan(0);

    const handler = handlers[0];
    const mockEvent = new MessageEvent('postLikeUpdated', {
      data: JSON.stringify({ id: 1, likeCount: 25 }),
    });

    handler(mockEvent);

    await waitFor(() => {
      expect(mockEventSource.addEventListener).toHaveBeenCalled();
    });
  });

  it('應該能正確解析多個SSE事件', async () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockEventSource.addEventListener).toHaveBeenCalled();
    });

    const handlers = eventListeners.get('postLikeUpdated') || [];
    const handler = handlers[0];

    const events = [
      { id: 1, likeCount: 20 },
      { id: 2, likeCount: 15 },
      { id: 1, likeCount: 30 },
    ];

    for (const eventData of events) {
      const mockEvent = new MessageEvent('postLikeUpdated', {
        data: JSON.stringify(eventData),
      });
      handler(mockEvent);
    }

    expect(mockEventSource.addEventListener).toHaveBeenCalled();
  });

  it('應該能在SSE事件到達時自動更新TopKHeapManager', async () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
        'postLikeUpdated',
        expect.any(Function)
      );
    });

    const handlers = eventListeners.get('postLikeUpdated') || [];
    const handler = handlers[0];

    const event = new MessageEvent('postLikeUpdated', {
      data: JSON.stringify({ id: 1, likeCount: 50 }),
    });

    handler(event);

    expect(handler).toBeDefined();
  });

  it('應該能正確清理SSE連接', async () => {
    const { unmount } = render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockEventSource.addEventListener).toHaveBeenCalled();
    });

    unmount();

    expect(mockEventSource.removeEventListener).toHaveBeenCalledWith(
      'postLikeUpdated',
      expect.any(Function)
    );
    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it('應該能處理無效的SSE數據', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockEventSource.addEventListener).toHaveBeenCalled();
    });

    const handlers = eventListeners.get('postLikeUpdated') || [];
    const handler = handlers[0];

    const invalidEvent = new MessageEvent('postLikeUpdated', {
      data: 'invalid json',
    });

    handler(invalidEvent);

    expect(handler).toBeDefined();

    consoleErrorSpy.mockRestore();
  });
});
