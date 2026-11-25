import React, { createContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { API_BASE_URL } from '../api/config';
import type { Post } from '../types/post';
import { getPosts } from '../api/posts';
import { buildBigramIndex } from '../utils/bigramIndex';

export const PostsContext = createContext<{
  posts: Post[];
  postsStatus?: 'loading' | 'ready' | 'error';
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
  const [postsStatus, setPostsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [index, setIndex] = useState<Map<string, Set<number>>>(new Map());
  const [sortBy, setSortBy] = useState('updated-desc');

  useEffect(() => {
    let request: AbortController | undefined;
    const fetchPosts = async () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;

      try {
        const data = await getPosts(controller.signal);
        if (controller.signal.aborted) return;
        setPosts(data);
        setIndex(buildBigramIndex(data));
        setPostsStatus('ready');
      } catch (err) {
        if (controller.signal.aborted) return;
        setPostsStatus('error');
        console.error(err);
      }
    };

    const eventSource = new EventSource(`${API_BASE_URL}/events`);
    let hasConnected = false;
    const handleOpen = () => {
      if (hasConnected) void fetchPosts();
      hasConnected = true;
    };

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
    eventSource.addEventListener('postChanged', fetchPosts);
    eventSource.addEventListener('open', handleOpen);
    void fetchPosts();

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
    };

    return () => {
      request?.abort();
      eventSource.removeEventListener('postLikeUpdated', handlePostLikeUpdated);
      eventSource.removeEventListener('postChanged', fetchPosts);
      eventSource.removeEventListener('open', handleOpen);
      eventSource.close();
    };
  }, []);

  return (
    <PostsContext.Provider value={{ posts, postsStatus, setPosts, category, setCategory, search, setSearch, index, setIndex, sortBy, setSortBy }}>
      <Header 
        onSelectCategory={setCategory}
        onSearch={setSearch}
      />
      <Outlet />
    </PostsContext.Provider>
  );
};

export default Layout;
