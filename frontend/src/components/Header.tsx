import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onSelectCategory?: (category: string) => void;
}

const categories = ['旅遊', '日記', '閒聊'];

const Header: React.FC<HeaderProps> = ({ onSelectCategory }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <header style={styles.header}>
      <h1 style={styles.logo} onClick={() => { onSelectCategory?.(''); navigate('/') }}>Potato's Blog</h1>
      <nav style={styles.nav}>
        {categories.map((cat) => (
          <button key={cat} style={styles.button} onClick={() => { onSelectCategory?.(cat); navigate('/'); }}>
            {cat}
          </button>
        ))}
        {user ? (
          <button style={styles.button} onClick={logout}>登出 ({user.username})</button>
        ) : (
          <button style={styles.button} onClick={() => navigate('/login')}>登入</button>
        )}
      </nav>
    </header>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#C68642',
    color: 'black',
  },
  logo: { cursor: 'pointer', margin: 0, fontWeight: 'bold' },
  nav: { display: 'flex', gap: '1rem' },
  button: { background: 'none', border: 'none', color: 'black', cursor: 'pointer', fontSize: '1rem' },
} as const;

export default Header;