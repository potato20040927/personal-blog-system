import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deletePost } from '../api/posts';
import { useContext } from 'react';
import { PostsContext } from '../components/Layout';
import './PostDetail.css';

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

  const post = posts.find(p => p.id === Number(id));
  if (!post) return <p>找不到文章</p>;

  const isAdmin = user?.role === 'admin';

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

  const isEdited = post.createdAt !== post.updatedAt;

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
      </div>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </div>
  </div>
);
};

export default PostDetail;