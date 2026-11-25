import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PostList from '../../pages/PostList';
import type { Post } from '../../types/post';

const posts: Post[] = [
  { id: 1, title: '文章1', content: '內容1', category: '旅遊', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', likeCount: 0 },
  { id: 2, title: '文章2', content: '內容2', category: '旅遊', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', likeCount: 0 },
];

describe('PostList', () => {
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
        <Routes>
          <Route path="/" element={<PostList posts={posts} />} />
          <Route path="/post/1" element={<h1>文章詳情</h1>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: '文章1' }));
    expect(screen.getByRole('heading', { name: '文章詳情' })).toBeInTheDocument();
  });
});
