import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError('請輸入帳號與密碼');
      return;
    }

    const success = await register(username, password);

    if (success) {
      navigate('/login');
    } else {
      setError('註冊失敗（帳號可能已存在）');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>註冊</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          maxWidth: '300px',
        }}
      >
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">註冊</button>

        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
};

export default RegisterPage;