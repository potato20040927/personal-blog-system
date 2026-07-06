import React, { useContext, useMemo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PostList from './PostList';
import { PostsContext } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';
import { searchBigram } from '../utils/bigramIndex';
import { PostIndexManager } from '../utils/PostIndexManager';
import { TopKHeapManager } from '../utils/TopKHeapManager';
import type { Post } from '../types/post';

const MOBILE_MEDIA_QUERY = '(max-width: 700px)';
const DESKTOP_PAGE_SIZE = 20;
const MOBILE_PAGE_SIZE = 10;

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '');
}

function getPageSize() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return DESKTOP_PAGE_SIZE;
  }

  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
    ? MOBILE_PAGE_SIZE
    : DESKTOP_PAGE_SIZE;
}

function getPaginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-end', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, 'ellipsis-start', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis-start', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end', totalPages];
}

function getPageKey(category: string | null, search: string, sortBy: string, pageSize: number) {
  return `${category ?? '全部'}|${search}|${sortBy}|${pageSize}`;
}

const HomePage: React.FC = () => {
  const context = useContext(PostsContext);
  if (!context) throw new Error('PostsContext 未提供');

  const { posts, category, search, index, sortBy } = context;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [indexManager] = useState(() => new PostIndexManager<Post>(
    (p) => new Date(p.createdAt).getTime(),
    (p) => new Date(p.updatedAt).getTime()
  ));

  const [topKManager] = useState(() => new TopKHeapManager(10));

  const [treeVersion, setTreeVersion] = useState(0);
  const [topKVersion, setTopKVersion] = useState(0);
  const [pageSize, setPageSize] = useState(getPageSize);
  const [paginationState, setPaginationState] = useState({
    page: 1,
    key: getPageKey(category, search, sortBy, getPageSize()),
  });
  const prevPostsRef = useRef<Post[]>([]);
  const prevTopKPostsRef = useRef<Post[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleChange = () => {
      setPageSize(mediaQuery.matches ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE);
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

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

  useEffect(() => {
    if (!posts) return;

    const prevPosts = prevTopKPostsRef.current;
    let needsUpdate = false;

    if (posts.length > 0 && prevPosts.length === 0 && topKManager.size() === 0) {
      topKManager.build(posts);
      needsUpdate = true;
    } else if (posts !== prevPosts) {
      const added = posts.filter(p => !prevPosts.find(prev => prev.id === p.id));
      const removed = prevPosts.filter(prev => !posts.find(p => p.id === prev.id));
      const updated = posts.filter(p => {
        const prev = prevPosts.find(prev => prev.id === p.id);
        return prev && (
          prev.likeCount !== p.likeCount ||
          prev.updatedAt !== p.updatedAt ||
          prev.title !== p.title ||
          prev.content !== p.content ||
          prev.category !== p.category
        );
      });

      added.forEach(p => topKManager.insert(p));
      removed.forEach(p => topKManager.remove(p));
      updated.forEach(p => topKManager.update(p));

      needsUpdate = added.length > 0 || removed.length > 0 || updated.length > 0;
    }

    if (needsUpdate) {
      setTopKVersion(v => v + 1);
    }

    prevTopKPostsRef.current = posts;
  }, [posts, topKManager]);

  const sortedPosts = useMemo(() => {
    if (posts.length === 0) return [];

    switch (sortBy) {
      case 'created-desc': return indexManager.getCreatedDesc();
      case 'created-asc':  return indexManager.getCreatedAsc();
      case 'updated-desc': return indexManager.getUpdatedDesc();
      case 'updated-asc':  return indexManager.getUpdatedAsc();
      case 'likes-desc':   return topKManager.getTopK();
      default:             return indexManager.getCreatedDesc();
    }
  }, [sortBy, indexManager, topKManager, treeVersion, topKVersion, posts.length]);

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

  const totalPages = Math.max(1, Math.ceil(finalDisplayPosts.length / pageSize));
  const pageKey = getPageKey(category, search, sortBy, pageSize);
  const currentPage = paginationState.key === pageKey
    ? Math.min(paginationState.page, totalPages)
    : 1;

  const setPage = (page: number) => {
    setPaginationState({
      page: Math.min(Math.max(1, page), totalPages),
      key: pageKey,
    });
  };

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return finalDisplayPosts.slice(startIndex, startIndex + pageSize);
  }, [finalDisplayPosts, currentPage, pageSize]);

  const paginationPages = useMemo(
    () => getPaginationPages(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const isAdmin = user?.role === 'admin';

  return (
    <>
      <PostList posts={paginatedPosts} />

      {finalDisplayPosts.length > pageSize && (
        <nav className="pagination" aria-label="文章分頁">
          <button
            type="button"
            className="pagination-button"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            上一頁
          </button>

          <div className="pagination-pages">
            {paginationPages.map((page) => (
              typeof page === 'number' ? (
                <button
                  type="button"
                  key={page}
                  className={`pagination-page${page === currentPage ? ' is-active' : ''}`}
                  onClick={() => setPage(page)}
                  aria-current={page === currentPage ? 'page' : undefined}
                  aria-label={`第 ${page} 頁`}
                >
                  {page}
                </button>
              ) : (
                <span key={page} className="pagination-ellipsis" aria-hidden="true">
                  ...
                </span>
              )
            ))}
          </div>

          <button
            type="button"
            className="pagination-button"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            下一頁
          </button>
        </nav>
      )}

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
