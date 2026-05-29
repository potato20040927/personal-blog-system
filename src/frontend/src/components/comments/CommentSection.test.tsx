import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  let eventListeners: Record<string, (event: MessageEvent) => void>;
  let mockEventSource: {
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    eventListeners = {};
    mockEventSource = {
      addEventListener: vi.fn((event: string, handler: (event: MessageEvent) => void) => {
        eventListeners[event] = handler;
      }),
      removeEventListener: vi.fn(),
      close: vi.fn(),
    };

    globalThis.EventSource = vi.fn(function EventSourceMock() {
      return mockEventSource;
    }) as any;
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

  it('以雙層格式顯示留言與回覆，並可回覆第二層留言', async () => {
    mockUseAuth.mockReturnValue({ user: { username: 'bob', role: 'user' } });
    mockGetComments.mockResolvedValue([
      {
        id: 1,
        post_id: 10,
        user_id: 2,
        username: 'alice',
        content: '第一層留言',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 2,
        post_id: 10,
        user_id: 3,
        parent_comment_id: 1,
        reply_to_comment_id: 1,
        username: 'bob',
        content: '第一則回覆',
        createdAt: '2026-01-01T01:00:00Z',
      },
    ]);
    mockCreateComment.mockResolvedValue({
      id: 3,
      post_id: 10,
      user_id: 3,
      parent_comment_id: 1,
      reply_to_comment_id: 2,
      reply_to_parent_comment_id: 1,
      username: 'bob',
      content: '回覆 B1-1',
      createdAt: '2026-01-01T02:00:00Z',
    });

    render(<CommentSection postId={10} />);

    expect((await screen.findAllByText('B1')).length).toBeGreaterThan(0);
    expect(screen.getByText('查看其他1則留言')).toBeInTheDocument();
    expect(screen.queryByText('B1-1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('查看其他1則留言'));

    expect(screen.getByText('B1-1')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('回覆')[1]);
    fireEvent.change(screen.getByPlaceholderText('回覆 B1-1...'), {
      target: { value: '回覆 B1-1' },
    });
    fireEvent.click(screen.getByText('送出回覆'));

    await waitFor(() => {
      expect(mockCreateComment).toHaveBeenCalledWith(10, '回覆 B1-1', 2);
    });

    expect(await screen.findByText('B1-2')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('B1')[1]);
    expect(document.getElementById('comment-1')).toHaveClass('comment-highlight');
  });

  it('收到 commentCreated SSE 後即時新增並展開回覆', async () => {
    mockUseAuth.mockReturnValue({ user: { username: 'bob', role: 'user' } });
    mockGetComments.mockResolvedValue([
      {
        id: 1,
        post_id: 10,
        user_id: 2,
        username: 'alice',
        content: '第一層留言',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);

    render(<CommentSection postId={10} />);

    expect(await screen.findByText('第一層留言')).toBeInTheDocument();
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
      'commentCreated',
      expect.any(Function)
    );

    act(() => {
      eventListeners.commentCreated({
        data: JSON.stringify({
          postId: 10,
          comment: {
            id: 2,
            post_id: 10,
            user_id: 3,
            parent_comment_id: 1,
            reply_to_comment_id: 1,
            username: 'bob',
            content: '即時回覆',
            createdAt: '2026-01-01T01:00:00Z',
          },
        }),
      } as MessageEvent);
    });

    expect(await screen.findByText('B1-1')).toBeInTheDocument();
    expect(screen.getByText('即時回覆')).toBeInTheDocument();
  });

  it('收到 commentUpdated 與 commentDeleted SSE 後同步更新畫面', async () => {
    mockUseAuth.mockReturnValue({ user: { username: 'bob', role: 'user' } });
    mockGetComments.mockResolvedValue([
      {
        id: 1,
        post_id: 10,
        user_id: 3,
        username: 'bob',
        content: '原本留言',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);

    render(<CommentSection postId={10} />);

    expect(await screen.findByText('原本留言')).toBeInTheDocument();

    act(() => {
      eventListeners.commentUpdated({
        data: JSON.stringify({
          postId: 10,
          comment: {
            id: 1,
            post_id: 10,
            user_id: 3,
            username: 'bob',
            content: '即時更新',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T01:00:00Z',
          },
        }),
      } as MessageEvent);
    });

    expect(await screen.findByText('即時更新')).toBeInTheDocument();

    act(() => {
      eventListeners.commentDeleted({
        data: JSON.stringify({
          postId: 10,
          id: 1,
          softDeleted: false,
        }),
      } as MessageEvent);
    });

    await waitFor(() => {
      expect(screen.queryByText('即時更新')).not.toBeInTheDocument();
    });
  });
});
