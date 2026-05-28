import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PostList from './PostList';
import type { Post } from '../components/PostCard';

// mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const posts: Post[] = [
  { id: 1, title: '文章1', content: '內容1', category: '旅遊', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', likeCount: 0 },
  { id: 2, title: '文章2', content: '內容2', category: '旅遊', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', likeCount: 0 },
];

describe('PostList', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the correct number of PostCard', () => {
    render(
      <MemoryRouter>
        <PostList posts={posts} />
      </MemoryRouter>
    );
    expect(screen.getByText('文章1')).toBeDefined();
    expect(screen.getByText('文章2')).toBeDefined();
  });

  it('renders post content correctly', () => {
    render(
      <MemoryRouter>
        <PostList posts={posts} />
      </MemoryRouter>
    );
    expect(screen.getByText('內容1')).toBeDefined();
    expect(screen.getByText('內容2')).toBeDefined();
  });

  it('clicking a PostCard navigates to post detail', () => {
    render(
      <MemoryRouter>
        <PostList posts={posts} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('文章1'));
    expect(mockNavigate).toHaveBeenCalledWith('/post/1');
  });
});
