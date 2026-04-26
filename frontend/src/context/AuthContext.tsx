import React, { createContext, useState, useContext, type ReactNode, useEffect } from 'react';

export type UserRole = 'guest' | 'member' | 'admin';

export interface User {
  username: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const users = [
    { username: 'admin', password: '1234', role: 'admin' },
    { username: 'member', password: '1234', role: 'member' },
  ];

  const login = (username: string, password: string) => {
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      const loggedUser = { username: found.username, role: found.role };
      setUser(loggedUser);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};