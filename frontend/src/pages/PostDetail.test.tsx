import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PostDetail from './PostDetail';
import { PostsContext } from '../components/Layout';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => mockNavigate,
}));

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockDeletePost = vi.fn();
vi.mock('../api/posts', () => ({
  deletePost: (...args: any[]) => mockDeletePost(...args),
}));

describe('PostDetail', () => {
  const mockSetPosts = vi.fn();

  const post = {
    id: 1,
    title: '測試文章',
    content: '<p>內容</p>',
    category: '旅遊',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('找不到文章', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'admin' },
    });

    render(
      <PostsContext.Provider value={{ posts: [], setPosts: mockSetPosts }}>
        <PostDetail />
      </PostsContext.Provider>
    );

    expect(screen.getByText('找不到文章')).toBeInTheDocument();
  });

  it('非 admin 不能看到修改刪除按鈕', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'user' },
    });

    render(
      <PostsContext.Provider value={{ posts: [post], setPosts: mockSetPosts }}>
        <PostDetail />
      </PostsContext.Provider>
    );

    expect(screen.queryByText('修改')).not.toBeInTheDocument();
    expect(screen.queryByText('刪除')).not.toBeInTheDocument();
  });

  it('admin 可以看到按鈕', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'admin' },
    });

    render(
      <PostsContext.Provider value={{ posts: [post], setPosts: mockSetPosts }}>
        <PostDetail />
      </PostsContext.Provider>
    );

    expect(screen.getByText('修改')).toBeInTheDocument();
    expect(screen.getByText('刪除')).toBeInTheDocument();
  });

  it('刪除文章成功', async () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'admin', name: 'test' },
    });

    mockDeletePost.mockResolvedValue({ message: '刪除成功' });

    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();

    render(
      <PostsContext.Provider value={{ posts: [post], setPosts: mockSetPosts }}>
        <PostDetail />
      </PostsContext.Provider>
    );

    fireEvent.click(screen.getByText('刪除'));

    await waitFor(() => {
      expect(mockDeletePost).toHaveBeenCalled();
    });

    expect(mockSetPosts).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('取消刪除', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'admin' },
    });

    window.confirm = vi.fn(() => false);

    render(
      <PostsContext.Provider value={{ posts: [post], setPosts: mockSetPosts }}>
        <PostDetail />
      </PostsContext.Provider>
    );

    fireEvent.click(screen.getByText('刪除'));

    expect(mockDeletePost).not.toHaveBeenCalled();
  });

  it('非 admin 嘗試刪除會被阻止', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'user' },
    });

    window.alert = vi.fn();

    render(
      <PostsContext.Provider value={{ posts: [post], setPosts: mockSetPosts }}>
        <PostDetail />
      </PostsContext.Provider>
    );

    expect(screen.queryByText('刪除')).not.toBeInTheDocument();
  });
});