import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Layout from '../../components/Layout';

const mockGetPosts = vi.fn();

vi.mock('../../api/posts', () => ({
  getPosts: () => mockGetPosts(),
}));

vi.mock('../../components/Header', () => ({
  default: () => <div>Header</div>,
}));

vi.mock('react-router-dom', () => ({
  Outlet: () => <div>Outlet</div>,
}));

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功載入 posts', async () => {
    mockGetPosts.mockResolvedValue([
      { id: 1, title: 'test', content: 'content', category: '旅遊' },
    ]);

    render(<Layout />);

    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalled();
    });

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Outlet')).toBeInTheDocument();
  });

  it('API 失敗不會 crash', async () => {
    mockGetPosts.mockRejectedValue(new Error('fail'));

    render(<Layout />);

    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalled();
    });

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Outlet')).toBeInTheDocument();
  });
});