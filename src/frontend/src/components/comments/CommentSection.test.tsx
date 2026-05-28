import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommentSection from './CommentSection';

const mockUseAuth = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockGetComments = vi.fn();
const mockCreateComment = vi.fn();
const mockUpdateComment = vi.fn();
const mockDeleteComment = vi.fn();
vi.mock('../../api/comments_api', () => ({
  getComments: (...args: any[]) => mockGetComments(...args),
  createComment: (...args: any[]) => mockCreateComment(...args),
  updateComment: (...args: any[]) => mockUpdateComment(...args),
  deleteComment: (...args: any[]) => mockDeleteComment(...args),
}));

describe('CommentSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('載入並顯示留言列表', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockGetComments.mockResolvedValue([
      {
        id: 1,
        post_id: 10,
        user_id: 2,
        username: 'alice',
        content: '第一則留言',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);

    render(<CommentSection postId={10} />);

    expect(mockGetComments).toHaveBeenCalledWith(10);
    expect(await screen.findByText('第一則留言')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('登入後即可留言。')).toBeInTheDocument();
  });

  it('登入使用者可以新增留言', async () => {
    mockUseAuth.mockReturnValue({ user: { username: 'bob', role: 'user' } });
    mockGetComments.mockResolvedValue([]);
    mockCreateComment.mockResolvedValue({
      id: 2,
      post_id: 10,
      user_id: 3,
      username: 'bob',
      content: '新留言',
      createdAt: '2026-01-02T00:00:00Z',
    });

    render(<CommentSection postId={10} />);

    await screen.findByText('目前還沒有留言。');

    fireEvent.change(screen.getByPlaceholderText('留下你的想法...'), {
      target: { value: '新留言' },
    });
    fireEvent.click(screen.getByText('送出留言'));

    await waitFor(() => {
      expect(mockCreateComment).toHaveBeenCalledWith(10, '新留言');
    });

    expect(await screen.findByText('新留言')).toBeInTheDocument();
  });

  it('留言作者可以編輯自己的留言', async () => {
    mockUseAuth.mockReturnValue({ user: { username: 'bob', role: 'user' } });
    mockGetComments.mockResolvedValue([
      {
        id: 3,
        post_id: 10,
        user_id: 3,
        username: 'bob',
        content: '原本留言',
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      },
    ]);
    mockUpdateComment.mockResolvedValue({
      id: 3,
      post_id: 10,
      user_id: 3,
      username: 'bob',
      content: '更新留言',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z',
    });

    render(<CommentSection postId={10} />);

    expect(await screen.findByText('原本留言')).toBeInTheDocument();

    fireEvent.click(screen.getByText('編輯'));
    fireEvent.change(screen.getByDisplayValue('原本留言'), {
      target: { value: '更新留言' },
    });
    fireEvent.click(screen.getByText('儲存'));

    await waitFor(() => {
      expect(mockUpdateComment).toHaveBeenCalledWith(3, '更新留言');
    });

    expect(await screen.findByText('更新留言')).toBeInTheDocument();
    expect(screen.getByText('已編輯')).toBeInTheDocument();
  });
});
