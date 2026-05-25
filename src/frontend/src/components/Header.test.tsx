import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PostsContext } from './Layout';

// mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// mock useAuth
vi.mock('../context/AuthContext', async () => {
  return {
    useAuth: () => ({
      user: { username: 'testUser' },
      logout: vi.fn(),
    }),
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

describe('Header', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('clicking the logo clears category and navigates home', () => {
    const onSelectCategory = vi.fn();

    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext}>
          <Header onSelectCategory={onSelectCategory} />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Potato's Blog"));

    expect(onSelectCategory).toHaveBeenCalledWith('');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('clicking a category calls onSelectCategory with that category', () => {
    const onSelectCategory = vi.fn();

    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext}>
          <Header onSelectCategory={onSelectCategory} />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('旅遊'));

    expect(onSelectCategory).toHaveBeenCalledWith('旅遊');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});