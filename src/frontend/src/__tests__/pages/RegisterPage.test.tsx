import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../../pages/RegisterPage';

const mockNavigate = vi.fn();
const mockRegister = vi.fn();

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
      register: mockRegister,
    }),
  };
});

describe('RegisterPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockRegister.mockClear();
  });

  it('renders form inputs and button', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('Username')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByRole('button', { name: /註冊/i })).toBeTruthy();
  });

  it('navigates to login on successful register', async () => {
    mockRegister.mockResolvedValue(true);

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'newuser' },
    });

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: '1234' },
    });

    fireEvent.click(screen.getByRole('button', { name: /註冊/i }));

    expect(mockRegister).toHaveBeenCalledWith('newuser', '1234');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('shows error when register fails', async () => {
    mockRegister.mockResolvedValue(false);

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'baduser' },
    });

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'wrong' },
    });

    fireEvent.click(screen.getByRole('button', { name: /註冊/i }));

    await waitFor(() => {
      expect(screen.getByText(/註冊失敗/)).toBeTruthy();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows validation error when fields are empty', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /註冊/i }));

    await waitFor(() => {
      expect(screen.getByText(/請輸入帳號與密碼/)).toBeTruthy();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });
});