import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PostDetail from '../../pages/PostDetail';
import { PostsContext } from '../../components/Layout';
import { createMockPostsContext } from '../test-utils/createMockPostsContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => mockNavigate,
}));

const mockUseAuth = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockGetLikeStatus = vi.fn();
const mockToggleLike = vi.fn();
const mockDeletePost = vi.fn();
const mockGetComments = vi.fn();
const mockCreateComment = vi.fn();

vi.mock('../../api/posts', () => ({
  deletePost: (...args: any[]) => mockDeletePost(...args),
  getLikeStatus: (...args: any[]) => mockGetLikeStatus(...args),
  toggleLike: (...args: any[]) => mockToggleLike(...args),
}));

vi.mock('../../api/comments_api', () => ({
  getComments: (...args: any[]) => mockGetComments(...args),
  createComment: (...args: any[]) => mockCreateComment(...args),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}));

describe('PostDetail', () => {
  const mockSetPosts = vi.fn();

  const post = {
    id: 1,
    title: '測試文章',
    content: '<p>內容</p>',
    category: '旅遊',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const baseContext = createMockPostsContext({
    posts: [post],
    setPosts: mockSetPosts,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetComments.mockResolvedValue([]);

    globalThis.EventSource = vi.fn(function EventSourceMock() {
      return {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        close: vi.fn(),
      };
    }) as any;
  });

  it('找不到文章', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'admin' },
    });

    render(
      <PostsContext.Provider value={createMockPostsContext({ posts: [] })}>
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
      <PostsContext.Provider value={baseContext}>
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
      <PostsContext.Provider value={baseContext}>
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
      <PostsContext.Provider value={baseContext}>
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
      <PostsContext.Provider value={baseContext}>
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
      <PostsContext.Provider value={baseContext}>
        <PostDetail />
      </PostsContext.Provider>
    );

    expect(screen.queryByText('刪除')).not.toBeInTheDocument();
  });

  it('顯示已按讚狀態', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, role: 'user' },
    });

    mockGetLikeStatus.mockResolvedValue({
      count: 5,
      liked: true,
    });

    render(
      <PostsContext.Provider value={baseContext}>
        <PostDetail />
      </PostsContext.Provider>
    );

    // 等 API 完成
    expect(await screen.findByText('5')).toBeInTheDocument();

    // button 狀態驗證
    const button = screen.getByTestId('like-button');
    expect(button).toHaveTextContent('5');
  });

  it('未登入時 liked 為 false 但 count 正常', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
    });

    mockGetLikeStatus.mockResolvedValue({
      count: 3,
      liked: true, // 前端應忽略
    });

    render(
      <PostsContext.Provider value={baseContext}>
        <PostDetail />
      </PostsContext.Provider>
    );

    expect(await screen.findByText('3')).toBeInTheDocument();

    const button = screen.getByTestId('like-button');
    expect(button).toHaveTextContent('3');
  });

  it('點擊按讚會呼叫 toggleLike', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, role: 'user' },
    });

    mockGetLikeStatus.mockResolvedValue({
      count: 1,
      liked: false,
    });

    mockToggleLike.mockResolvedValue({
      count: 2,
      liked: true,
    });

    render(
      <PostsContext.Provider value={baseContext}>
        <PostDetail />
      </PostsContext.Provider>
    );

    const button = await screen.findByTestId('like-button');

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToggleLike).toHaveBeenCalledWith('1');
    });

    // UI 更新驗證
    await waitFor(() => {
      expect(screen.getByTestId('like-button')).toHaveTextContent('2');
    });
  });

  it('在文章詳細頁整合顯示留言區與留言列表', async () => {
    mockUseAuth.mockReturnValue({
      user: { username: 'bob', role: 'user' },
    });
    mockGetLikeStatus.mockResolvedValue({
      count: 0,
      liked: false,
    });
    mockGetComments.mockResolvedValue([
      {
        id: 10,
        post_id: 1,
        user_id: 2,
        username: 'alice',
        content: '文章頁留言',
        createdAt: '2026-01-02T00:00:00Z',
      },
    ]);

    render(
      <PostsContext.Provider value={baseContext}>
        <PostDetail />
      </PostsContext.Provider>
    );

    expect(screen.getByText('測試文章')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '留言' })).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetComments).toHaveBeenCalledWith(1);
    });
    expect(await screen.findByText('文章頁留言')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('登入使用者可以直接在文章詳細頁新增留言', async () => {
    mockUseAuth.mockReturnValue({
      user: { username: 'bob', role: 'user' },
    });
    mockGetLikeStatus.mockResolvedValue({
      count: 0,
      liked: false,
    });
    mockGetComments.mockResolvedValue([]);
    mockCreateComment.mockResolvedValue({
      id: 11,
      post_id: 1,
      user_id: 3,
      username: 'bob',
      content: '從文章頁新增',
      createdAt: '2026-01-02T00:00:00Z',
    });

    render(
      <PostsContext.Provider value={baseContext}>
        <PostDetail />
      </PostsContext.Provider>
    );

    await screen.findByText('目前還沒有留言。');

    fireEvent.change(screen.getByPlaceholderText('留下你的想法...'), {
      target: { value: '從文章頁新增' },
    });
    fireEvent.click(screen.getByRole('button', { name: '送出留言' }));

    await waitFor(() => {
      expect(mockCreateComment).toHaveBeenCalledWith(1, '從文章頁新增');
    });
    expect(await screen.findByText('從文章頁新增')).toBeInTheDocument();
  });
});
