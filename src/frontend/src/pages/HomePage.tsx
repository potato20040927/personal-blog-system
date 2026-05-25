import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import PostList from './PostList';
import { PostsContext } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';
import { searchBigram } from '../utils/bigramIndex';

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '');
}

const HomePage: React.FC = () => {
  const context = useContext(PostsContext);
  if (!context) throw new Error('PostsContext 未提供');

  const { posts, category, search, index } = context;
  const { user } = useAuth();
  const navigate = useNavigate();

  let filteredPosts = posts;

  filteredPosts = filteredPosts.filter(
    p => !category || category === '全部' || p.category === category
  );

  if (search) {
    const query = search.trim();

    // 1字搜尋: fallback linear scan
    if (query.length < 2) {
      filteredPosts = filteredPosts.filter(p => {
        const text = stripHtml(p.content);
        return (
          p.title.includes(query) ||
          text.includes(query)
        );
      });
    } else {
      // bigram search
      const ids = searchBigram(query, index);

      filteredPosts = filteredPosts.filter(p => {
        if (!ids.size) return false;

        const text = stripHtml(p.content);

        return (
          ids.has(p.id) &&
          (p.title.includes(query) || text.includes(query))
        );
      });
    }
  }

  return (
    <>
      <PostList posts={filteredPosts} />

      {user?.role === 'admin' && (
        <button
          onClick={() => navigate('/new')}
          className="floating-btn"
        >
          +
        </button>
      )}
    </>
  );
};

export default HomePage;