import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import PostList from './PostList';
import { PostsContext } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '');
}

const HomePage: React.FC = () => {
  const context = useContext(PostsContext);
  if (!context) throw new Error('PostsContext 未提供');

  const { posts, category, search } = context;
  const { user } = useAuth();
  const navigate = useNavigate();

  const filteredPosts = posts
    .filter(p => !category || category === '全部' || p.category === category)
    .filter(p => {
      if (!search) return true;

      const textContent = stripHtml(p.content);

      return (
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        textContent.toLowerCase().includes(search.toLowerCase())
      );
    });

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