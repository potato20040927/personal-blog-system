import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import { vi, describe, it, expect, beforeEach } from 'vitest';

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

describe('Header', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('clicking the logo clears category and navigates home', () => {
    const onSelectCategory = vi.fn();

    render(
      <MemoryRouter>
        <Header onSelectCategory={onSelectCategory} />
      </MemoryRouter>
    );

    const logo = screen.getByText("Potato's Blog");
    fireEvent.click(logo);

    expect(onSelectCategory).toHaveBeenCalledWith('');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('clicking a category calls onSelectCategory with that category', () => {
    const onSelectCategory = vi.fn();

    render(
      <MemoryRouter>
        <Header onSelectCategory={onSelectCategory} />
      </MemoryRouter>
    );

    const button = screen.getByText('旅遊');
    fireEvent.click(button);

    expect(onSelectCategory).toHaveBeenCalledWith('旅遊');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});