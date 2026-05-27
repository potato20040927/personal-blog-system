import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deletePost, getLikeStatus, toggleLike } from '../api/posts';
import { useContext } from 'react';
import { PostsContext } from '../components/Layout';
import './PostDetail.css';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const context = useContext(PostsContext);
  if (!context) throw new Error('PostsContext 未提供');

  const { posts, setPosts } = context;
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const isAdmin = user?.role === 'admin';

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loadingLike, setLoadingLike] = useState(true);

  const post = posts.find(p => p.id === Number(id));
  

  const handleDelete = async () => {
    if (!isAdmin) {
      alert('你沒有權限刪除文章');
      return;
    }

    const confirmDelete = window.confirm('確定要刪除這篇文章嗎？');
    if (!confirmDelete) return;

    try {
      const data = await deletePost(id!);

      alert(data.message || '文章已刪除');

      setPosts(prev => prev.filter(p => p.id !== Number(id)));

      navigate('/');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = () => {
    if (!isAdmin) return;
    navigate(`/post/${id}/edit`);
  };

  useEffect(() => {
    if (!id) return;

    const fetchLikeStatus = async () => {
      try {
        const data = await getLikeStatus(id);
        setLikeCount(data.count);
        setLiked(!!user && data.liked);
      } catch (err) {
        setLiked(false);
      } finally {
        setLoadingLike(false);
      }
    };

    fetchLikeStatus();
  }, [id, user]);

  if (!post) return <p>找不到文章</p>;
  const isEdited = post.createdAt !== post.updatedAt;

  const handleLike = async () => {
    if (loadingLike || !id) return;

    if (!isLoggedIn) {
      alert('請先登入才能按讚');
      navigate('/login');
      return;
    }

    try {
      const data = await toggleLike(id!);
      setLiked(data.liked);
      setLikeCount(data.count);
    } catch (err) {
      alert('操作失敗');
    }
  };

  return (
  <div
    style={{
      padding: '2rem',
      display: 'flex',
      justifyContent: 'center',
      position: 'relative',
    }}
  >
    {/* toolbar */}
    <div className="toolbar">
      <button className="btn" onClick={() => navigate(-1)}>
        返回
      </button>

      {isAdmin && (
        <>
          <button className="btn btn-edit" onClick={handleEdit}>
            修改
          </button>

          <button className="btn btn-delete" onClick={handleDelete}>
            刪除
          </button>
        </>
      )}
    </div>

    {/* content */}
    <div
      style={{
        maxWidth: '800px',
        width: '100%',
        marginTop: '3rem',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ marginBottom: '0.3rem' }}>
         {post.title}
        </h1>

        <div style={{ fontSize: '0.85rem', color: '#888' }}>
          建立日期：{formatDate(post.createdAt)}

          {isEdited && (
            <span style={{ marginLeft: '10px' }}>
              更新日期：{formatDate(post.updatedAt)}
            </span>
          )}
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            data-testid="like-button"
            onClick={handleLike}
            disabled={loadingLike}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '999px',
              border: '1px solid #ddd',
              cursor: loadingLike ? 'not-allowed' : 'pointer',
              backgroundColor: liked ? '#ffe6e6' : '#f5f5f5',
              color: liked ? '#e74c3c' : '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: '0.2s',
            }}
          >
            {liked ? (
              <FaHeart color="#e74c3c" />
              ) : (
              <FaRegHeart />
            )}

            <span>{likeCount}</span>
          </button>
        </div>
      </div>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </div>
  </div>
);
};

export default PostDetail;