import React, { createContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import type { Post } from './PostCard';
import { getPosts } from '../api/posts';
import { buildBigramIndex } from '../utils/bigramIndex';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const PostsContext = createContext<{
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  category: string | null;
  setCategory: React.Dispatch<React.SetStateAction<string | null>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  index: Map<string, Set<number>>;
  setIndex: React.Dispatch<React.SetStateAction<Map<string, Set<number>>>>;
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
} | null>(null);

const Layout: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [index, setIndex] = useState<Map<string, Set<number>>>(new Map());
  const [sortBy, setSortBy] = useState('updated-desc');

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

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/events`);

    const handlePostLikeUpdated = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload || typeof payload.id !== 'number') return;

        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === payload.id
              ? { ...post, likeCount: payload.likeCount }
              : post
          )
        );
      } catch (error) {
        console.error('Failed to parse SSE payload:', error);
      }
    };

    eventSource.addEventListener('postLikeUpdated', handlePostLikeUpdated);

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
    };

    return () => {
      eventSource.removeEventListener('postLikeUpdated', handlePostLikeUpdated);
      eventSource.close();
    };
  }, []);

  return (
    <PostsContext.Provider value={{ posts, setPosts, category, setCategory, search, setSearch, index, setIndex, sortBy, setSortBy }}>
      <Header 
        onSelectCategory={setCategory}
        onSearch={setSearch}
      />
      <Outlet />
    </PostsContext.Provider>
  );
};

export default Layout;