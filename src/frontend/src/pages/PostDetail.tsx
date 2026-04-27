import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type Post } from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { deletePost } from '../api/posts';
import { useContext } from 'react';
import { PostsContext } from '../components/Layout';
import './PostDetail.css';

interface ContextType {
  initialPosts: Post[];
  setPosts?: (posts: Post[]) => void;
}

const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const context = useContext(PostsContext);
  if (!context) throw new Error('PostsContext 未提供');

  const { posts, setPosts } = context;
  const { user } = useAuth();

  const post = posts.find(p => p.id === Number(id));
  if (!post) return <p>找不到文章</p>;

  const handleDelete = async () => {
    if (!user || user.role !== 'admin') {
      alert('你沒有權限刪除文章');
      return;
    }

    const confirmDelete = window.confirm('確定要刪除這篇文章嗎？');
    if (!confirmDelete) return;

    try {
      const data = await deletePost(id!, user);

      alert(data.message || '文章已刪除');

      setPosts(prev => prev.filter(p => p.id !== Number(id)));

      navigate('/');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = () => {
    if (!user || user.role !== 'admin') return;
    navigate(`/post/${id}/edit`);
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

      {user?.role === 'admin' && (
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
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </div>
  </div>
);
};

export default PostDetail;