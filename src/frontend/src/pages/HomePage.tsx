import React, { useContext, useMemo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PostList from './PostList';
import { PostsContext } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';
import { searchBigram } from '../utils/bigramIndex';
import { PostIndexManager } from '../utils/PostIndexManager';

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '');
}

const HomePage: React.FC = () => {
  const context = useContext(PostsContext);
  if (!context) throw new Error('PostsContext 未提供');

  const { posts, category, search, index, sortBy } = context;
  const { user } = useAuth();
  const navigate = useNavigate();

  const indexManager = useRef(new PostIndexManager<any>(
    (p) => new Date(p.createdAt).getTime(),
    (p) => new Date(p.updatedAt).getTime()
  )).current;

  const [treeVersion, setTreeVersion] = useState(0);
  const prevPostsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!posts) return;

    const prevPosts = prevPostsRef.current;
    const isTreeEmpty = indexManager.getCreatedAsc().length === 0;
    let needsUpdate = false;

    if (posts.length > 0 && isTreeEmpty) {
      indexManager.rebuild(posts);
      needsUpdate = true;
    } 
    else if (posts !== prevPosts) {
      const added = posts.filter(p => !prevPosts.find(prev => prev.id === p.id));
      const removed = prevPosts.filter(prev => !posts.find(p => p.id === prev.id));
      const updated = posts.filter(p => {
        const prev = prevPosts.find(prev => prev.id === p.id);
        return prev && (prev.updatedAt !== p.updatedAt || prev.title !== p.title);
      });

      if (added.length > 0 || removed.length > 0 || updated.length > 0) {
        added.forEach(p => indexManager.insert(p));
        removed.forEach(p => indexManager.delete(p));
        updated.forEach(p => {
          const oldItem = prevPosts.find(prev => prev.id === p.id);
          if (oldItem) indexManager.update(oldItem, p);
        });
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      setTreeVersion(v => v + 1);
    }

    prevPostsRef.current = posts;
  }, [posts, indexManager]);

  const sortedPosts = useMemo(() => {
    if (posts.length === 0) return [];

    switch (sortBy) {
      case 'created-desc': return indexManager.getCreatedDesc();
      case 'created-asc':  return indexManager.getCreatedAsc();
      case 'updated-desc': return indexManager.getUpdatedDesc();
      case 'updated-asc':  return indexManager.getUpdatedAsc();
      default:             return indexManager.getCreatedDesc();
    }
  }, [sortBy, indexManager, treeVersion, posts.length]);

  const finalDisplayPosts = useMemo(() => {
    let result = sortedPosts;

    if (category && category !== '全部') {
      result = result.filter(p => p.category === category);
    }

    if (search) {
      const query = search.trim();
      if (query.length < 2) {
        result = result.filter(p => {
          const text = stripHtml(p.content);
          return p.title.includes(query) || text.includes(query);
        });
      } else {
        const ids = searchBigram(query, index);
        result = result.filter(p => {
          const text = stripHtml(p.content);
          return ids.has(p.id) && (p.title.includes(query) || text.includes(query));
        });
      }
    }
    return result;
  }, [sortedPosts, category, search, index]);

  const isAdmin = user?.role === 'admin';

  return (
    <>
      <PostList posts={finalDisplayPosts} />

      {isAdmin && (
        <button
          onClick={() => navigate('/new')}
          className="floating-btn"
          aria-label="新增文章"
        >
          +
        </button>
      )}
    </>
  );
};

export default HomePage;