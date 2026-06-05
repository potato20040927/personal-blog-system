import React, { createContext, useState, useContext, type ReactNode, useEffect } from 'react';
import { apiClient } from '../api/client';

export type UserRole = 'user' | 'admin';

export interface User {
  username: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);


  const login = async (username: string, password: string) => {
    try {
      const res = await apiClient<{
        token: string;
        username: string;
        role: UserRole;
      }>('/auth/login', {
        method: 'POST',
        body: { username, password },
      });

      const userData = {
        username: res.username,
        role: res.role,
      };

      setUser(userData);
      setToken(res.token);

      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(userData));

      return true;
    } catch {
      return false;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      await apiClient('/auth/register', {
        method: 'POST',
        body: { username, email, password },
      });

      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
