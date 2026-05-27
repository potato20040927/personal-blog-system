import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PostsContext } from './Layout';

interface HeaderProps {
  onSelectCategory?: (category: string) => void;
  onSearch?: (keyword: string) => void;
}

const categories = ['旅遊', '日記', '閒聊'];

const Header: React.FC<HeaderProps> = ({ onSelectCategory, onSearch }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const context = useContext(PostsContext);
  if (!context) throw new Error('PostsContext 未提供');
  const { search, sortBy, setSortBy } = context;

  return (
    <header style={styles.header}>
      <h1 style={styles.logo} onClick={() => { onSelectCategory?.(''); onSearch?.(''); navigate('/') }}>Potato's Blog</h1>
      <nav style={styles.nav}>
        {categories.map((cat) => (
          <button key={cat} style={styles.button} onClick={() => { onSelectCategory?.(cat); navigate('/'); }}>
            {cat}
          </button>
        ))}

        <div style={styles.controlGroup}>
          <div style={styles.searchWrapper}>
            <input
              type="text"
              placeholder="搜尋文章..."
              value={search}
              onChange={(e) => onSearch?.(e.target.value)}
              style={styles.searchInput}
            />

            {search && (
              <button
                onClick={() => onSearch?.('')}
                style={styles.clearButton}
              >
                ✖
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.sortSelect}
          >
            <option value="updated-desc">最近更新</option>
            <option value="updated-asc">最舊更新</option>
            <option value="created-desc">最新發布</option>
            <option value="created-asc">最舊發布</option>
            <option value="likes-desc">按讚最多</option>
          </select>
        </div>

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
  searchWrapper: {
    position: 'relative',
    display: 'inline-block'
  },
  searchInput: {
    padding: '0.4rem 2rem 0.4rem 0.6rem',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '0.9rem'
  },
  clearButton: {
    position: 'absolute',
    right: '6px',
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#666'
  },
  sortSelect: {
    padding: '0.4rem',
    borderRadius: '4px',
    border: '1px solid rgba(0,0,0,0.2)',
    fontSize: '0.9rem',
    backgroundColor: 'transparent',
    color: 'black',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: 'pointer',
  },
  controlGroup: {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
},
  logo: { cursor: 'pointer', margin: 0, fontWeight: 'bold' },
  nav: { display: 'flex', gap: '1rem' },
  button: { background: 'none', border: 'none', color: 'black', cursor: 'pointer', fontSize: '1rem' },
} as const;

export default Header;