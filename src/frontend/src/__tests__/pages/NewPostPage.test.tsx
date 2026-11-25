import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NewPostPage from '../../pages/NewPostPage';
import { PostsContext } from '../../components/Layout';
import { createMockPostsContext } from '../test-utils/createMockPostsContext';

const mockNavigate = vi.fn();
const mockUseSearchParams = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => mockUseSearchParams(),
}));

vi.mock('../../api/districts', () => ({
  getDistricts: vi.fn().mockResolvedValue([
    { id: 'taichung-tanzi', county: '臺中市', name: '潭子區' },
    { id: 'taichung-beitun', county: '臺中市', name: '北屯區' },
  ]),
}));

const mockUseAuth = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockCreatePost = vi.fn();
vi.mock('../../api/posts', () => ({
  createPost: (...args: any[]) => mockCreatePost(...args),
}));

vi.mock('../../components/RichTextEditor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      data-testid="rich-text-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe('NewPostPage', () => {
  const mockSetPosts = vi.fn();

  const mockContextValue = createMockPostsContext({
    posts: [],
    setPosts: mockSetPosts,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue([new URLSearchParams()]);
  });

  it('非 admin 顯示沒有權限訊息', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'user' },
    });

    render(
      <PostsContext.Provider value={mockContextValue}>
        <NewPostPage />
      </PostsContext.Provider>
    );

    expect(screen.getByText('你沒有權限新增文章')).toBeInTheDocument();
  });

  it('admin 可以看到表單', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'admin' },
    });

    render(
      <PostsContext.Provider value={mockContextValue}>
        <NewPostPage />
      </PostsContext.Provider>
    );

    expect(screen.getByText('新增文章')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('輸入文章標題')).toBeInTheDocument();
  });

  it('成功送出文章', async () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'admin', name: 'test' },
    });

    mockCreatePost.mockResolvedValue({
      id: 1,
      title: '測試文章',
      content: '內容',
      category: '旅遊',
    });

    window.alert = vi.fn();

    render(
      <PostsContext.Provider value={mockContextValue}>
        <NewPostPage />
      </PostsContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('輸入文章標題'), {
      target: { value: '測試文章' },
    });

    fireEvent.change(screen.getByTestId('rich-text-editor'), {
      target: { value: '內容' },
    });

    fireEvent.click(screen.getByText('送出'));

    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalled();
    });

    expect(mockSetPosts).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('API 失敗', async () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'admin' },
    });

    mockCreatePost.mockRejectedValue(new Error('fail'));
    window.alert = vi.fn();

    render(
      <PostsContext.Provider value={mockContextValue}>
        <NewPostPage />
      </PostsContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('輸入文章標題'), {
      target: { value: '測試文章' },
    });

    fireEvent.click(screen.getByText('送出'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('新增文章失敗');
    });
  });

  it('由地圖新增文章時預填行政區並允許加入其他行政區', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('from=map&district=taichung-tanzi')]);
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } });
    mockCreatePost.mockResolvedValue({ id: 1, title: '旅行文章' });
    window.alert = vi.fn();

    render(
      <PostsContext.Provider value={mockContextValue}>
        <NewPostPage />
      </PostsContext.Provider>
    );

    expect(await screen.findByRole('button', { name: '移除 臺中市潭子區' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('標記縣市'), { target: { value: '臺中市' } });
    fireEvent.change(screen.getByLabelText('加入行政區'), { target: { value: 'taichung-beitun' } });
    fireEvent.change(screen.getByPlaceholderText('輸入文章標題'), { target: { value: '旅行文章' } });
    fireEvent.change(screen.getByTestId('rich-text-editor'), { target: { value: '旅途內容' } });
    fireEvent.click(screen.getByRole('button', { name: '送出' }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/map?district=taichung-tanzi'));
    expect(mockCreatePost).toHaveBeenCalledWith({
      title: '旅行文章',
      content: '旅途內容',
      category: '旅遊',
      districtIds: ['taichung-tanzi', 'taichung-beitun'],
    });
  });
});
