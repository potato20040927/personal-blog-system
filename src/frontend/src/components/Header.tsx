import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PostsContext } from './Layout';
import './Header.css';

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
    <header className="site-header">
      <h1 className="site-logo" onClick={() => { onSelectCategory?.(''); onSearch?.(''); navigate('/') }}>Potato's Blog</h1>
      <nav className="site-nav">
        {categories.map((cat) => (
          <button key={cat} className="header-button" onClick={() => { onSelectCategory?.(cat); navigate('/'); }}>
            {cat}
          </button>
        ))}

        <div className="header-control-group">
          <div className="header-search-wrapper">
            <input
              type="text"
              placeholder="搜尋文章..."
              value={search}
              onChange={(e) => onSearch?.(e.target.value)}
              className="header-search-input"
            />

            {search && (
              <button
                onClick={() => onSearch?.('')}
                className="header-clear-button"
                aria-label="清除搜尋"
              >
                ✖
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="header-sort-select"
          >
            <option value="updated-desc">最近更新</option>
            <option value="updated-asc">最舊更新</option>
            <option value="created-desc">最新發布</option>
            <option value="created-asc">最舊發布</option>
            <option value="likes-desc">讚數前十</option>
          </select>
        </div>

        {user ? (
          <button className="header-button" onClick={logout}>登出 ({user.username})</button>
        ) : (
          <button className="header-button" onClick={() => navigate('/login')}>登入</button>
        )}
      </nav>
    </header>
  );
};

export default Header;
