import React, { createContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import type { Post } from './PostCard';
import { getPosts } from '../api/posts';

export const PostsContext = createContext<{
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
} | null>(null);

const Layout: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getPosts();
        setPosts(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchPosts();
  }, []);

  return (
    <PostsContext.Provider value={{ posts, setPosts, category, setCategory }}>
      <Header onSelectCategory={setCategory} />
      <Outlet />
    </PostsContext.Provider>
  );
};

export default Layout;