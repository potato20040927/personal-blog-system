import React, { useContext, useState } from 'react';
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
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  const context = useContext(PostsContext);
  if (!context) throw new Error('PostsContext 未提供');
  const { category, search, sortBy, setSortBy } = context;

  const selectCategory = (cat: string) => {
    onSelectCategory?.(cat);
    setIsCategoryMenuOpen(false);
    navigate('/');
  };

  const resetHome = () => {
    onSelectCategory?.('');
    onSearch?.('');
    setIsCategoryMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="site-brand">
        <h1 className="site-logo" onClick={resetHome}>Potato's Blog</h1>

        <div className="mobile-category-menu">
          <button
            type="button"
            className="mobile-category-toggle"
            onClick={() => setIsCategoryMenuOpen((isOpen) => !isOpen)}
            aria-expanded={isCategoryMenuOpen}
            aria-controls="mobile-category-panel"
            aria-label="開啟文章分類選單"
          >
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>

          {isCategoryMenuOpen && (
            <div id="mobile-category-panel" className="mobile-category-panel">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`header-button header-category-button${category === cat ? ' is-active' : ''}`}
                  aria-pressed={category === cat}
                  onClick={() => selectCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav className="site-nav">
        <div className="header-category-group">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`header-button header-category-button${category === cat ? ' is-active' : ''}`}
              aria-pressed={category === cat}
              onClick={() => selectCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

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
          <button className="header-button header-auth-button" onClick={logout}>登出 ({user.username})</button>
        ) : (
          <button className="header-button header-auth-button" onClick={() => navigate('/login')}>登入</button>
        )}
      </nav>
    </header>
  );
};

export default Header;
