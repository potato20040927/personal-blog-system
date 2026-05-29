import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('請輸入帳號與密碼');
      return;
    }

    const success = await login(username, password);

    if (success) {
      navigate('/');
    } else {
      setError('登入失敗，請檢查帳號或密碼');
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <h2 id="login-title">登入</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="auth-input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="auth-button" type="submit">登入</button>

          {error && <p className="auth-error">{error}</p>}
        </form>

        <p className="auth-switch">
          還沒有帳號？ <a href="/register">註冊</a>
        </p>
      </section>
    </main>
  );
};

export default LoginPage;
