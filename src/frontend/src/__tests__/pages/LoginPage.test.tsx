import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../pages/LoginPage';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../context/AuthContext', async () => {
  return {
    useAuth: () => ({
      login: mockLogin,
    }),
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLogin.mockClear();
  });

  it('renders form inputs and button', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('Username')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByRole('button', { name: /登入/i })).toBeTruthy();
  });

  it('navigates to home on successful login', async () => {
    mockLogin.mockResolvedValue(true);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'admin' },
    });

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: '1234' },
    });

    fireEvent.click(screen.getByRole('button', { name: /登入/i }));

    expect(mockLogin).toHaveBeenCalledWith('admin', '1234');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error message on failed login', async () => {
    mockLogin.mockResolvedValue(false);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'user' },
    });

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'wrong' },
    });

    fireEvent.click(screen.getByRole('button', { name: /登入/i }));

    await waitFor(() => {
      expect(screen.getByText(/登入失敗/)).toBeTruthy();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});