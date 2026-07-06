import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../../components/Header';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PostsContext } from '../../components/Layout';

// mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// mock useAuth
vi.mock('../../context/AuthContext', async () => {
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
  sortBy: 'updated-desc',
  setSortBy: vi.fn(),
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

  it('clicking the map button clears filters and navigates to the map page', () => {
    const onSelectCategory = vi.fn();
    const onSearch = vi.fn();

    render(
      <MemoryRouter>
        <PostsContext.Provider value={{ ...mockContext, category: '旅遊', search: '台北' }}>
          <Header onSelectCategory={onSelectCategory} onSearch={onSearch} />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: '地圖' }));

    expect(onSelectCategory).toHaveBeenCalledWith('');
    expect(onSearch).toHaveBeenCalledWith('');
    expect(mockNavigate).toHaveBeenCalledWith('/map');
  });

  it('opens the mobile category menu and closes it after selecting a category', () => {
    const onSelectCategory = vi.fn();

    render(
      <MemoryRouter>
        <PostsContext.Provider value={mockContext}>
          <Header onSelectCategory={onSelectCategory} />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    const menuButton = screen.getByRole('button', { name: '開啟文章分類選單' });

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: '日記' })).toBeInTheDocument();
    expect(document.querySelector('#mobile-category-panel')).not.toBeInTheDocument();

    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('#mobile-category-panel')).toBeInTheDocument();

    const mobilePanel = document.querySelector('#mobile-category-panel') as HTMLElement;
    const mobileDiaryButton = within(mobilePanel).getByRole('button', { name: '日記' });

    fireEvent.click(mobileDiaryButton);

    expect(onSelectCategory).toHaveBeenCalledWith('日記');
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(document.querySelector('#mobile-category-panel')).not.toBeInTheDocument();
  });

  it('marks the selected category as active', () => {
    render(
      <MemoryRouter>
        <PostsContext.Provider value={{ ...mockContext, category: '閒聊' }}>
          <Header />
        </PostsContext.Provider>
      </MemoryRouter>
    );

    const activeCategory = screen.getByRole('button', { name: '閒聊' });

    expect(activeCategory).toHaveClass('is-active');
    expect(activeCategory).toHaveAttribute('aria-pressed', 'true');
  });
});
