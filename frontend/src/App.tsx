import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import PostList from './pages/PostList';
import { useAuth } from './context/AuthContext';
import { PostsContext } from './components/Layout';
import './App.css';

const App: React.FC = () => {
  const context = useContext(PostsContext);
  if (!context) throw new Error('PostsContext 未提供');

  const { posts, category } = context;

  const { user } = useAuth();
  const navigate = useNavigate();

  const filteredPosts = category && category !== '全部'
    ? posts.filter(p => p.category === category)
    : posts;

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

export default App;