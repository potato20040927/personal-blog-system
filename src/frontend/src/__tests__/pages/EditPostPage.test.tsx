import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EditPostPage from '../../pages/EditPostPage';
import { PostsContext } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { getPostById } from '../../api/posts';

// router
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '1' }),
  };
});

// auth
vi.mock('../../context/AuthContext', () => {
  return {
    useAuth: vi.fn(),
  };
});

// API
vi.mock('../../api/posts', () => {
  return {
    getPostById: vi.fn(),
    updatePost: vi.fn(),
  };
});

const mockContext = {
  posts: [],
  setPosts: vi.fn(),
  category: '',
  setCategory: vi.fn(),
  search: '',
  setSearch: vi.fn(),
  index: new Map(),
  setIndex: vi.fn(),
};

const mockPost = {
  id: 1,
  title: 'Test Title',
  content: 'Test Content',
  category: '旅遊',
};

describe('EditPostPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('renders form for admin', async () => {
    (useAuth as any).mockReturnValue({
      user: { role: 'admin' },
    });

    (getPostById as any).mockResolvedValue(mockPost);

    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext as any}>
          <EditPostPage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('修改文章')).toBeTruthy();
    });

    expect(screen.getByDisplayValue('Test Title')).toBeTruthy();
  });

  it('blocks non-admin users', () => {
    (useAuth as any).mockReturnValue({
      user: { role: 'user' },
    });

    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext as any}>
          <EditPostPage />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('你沒有權限修改文章')).toBeTruthy();
  });
});