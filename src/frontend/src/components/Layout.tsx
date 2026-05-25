import React, { createContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import type { Post } from './PostCard';
import { getPosts } from '../api/posts';
import { buildBigramIndex } from '../utils/bigramIndex';

export const PostsContext = createContext<{
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  category: string | null;
  setCategory: React.Dispatch<React.SetStateAction<string | null>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  index: Map<string, Set<number>>;
  setIndex: React.Dispatch<React.SetStateAction<Map<string, Set<number>>>>;
} | null>(null);

const Layout: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [index, setIndex] = useState<Map<string, Set<number>>>(new Map());

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getPosts();
        setPosts(data);
        setIndex(buildBigramIndex(data));
      } catch (err) {
        console.error(err);
      }
    };

    fetchPosts();
  }, []);

  return (
    <PostsContext.Provider value={{ posts, setPosts, category, setCategory, search, setSearch, index, setIndex }}>
      <Header 
        onSelectCategory={setCategory}
        onSearch={setSearch}
      />
      <Outlet />
    </PostsContext.Provider>
  );
};

export default Layout;