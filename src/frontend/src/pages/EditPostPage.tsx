import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PostsContext } from '../components/Layout';
import { getPostById, updatePost } from '../api/posts';
import RichTextEditor from '../components/RichTextEditor';
import DistrictPicker from '../components/DistrictPicker';
import { uploadImageToCloudinary } from '../utils/uploadImageToCloudinary';
import { getTravelMapPath } from '../utils/travelMap';
import './PostEditorPage.css';

const categories = ['旅遊', '日記', '閒聊'];

const EditPostPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const context = useContext(PostsContext);
  if (!context) throw new Error('PostsContext 未提供');

  const { setPosts } = context;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [districtIds, setDistrictIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!id) return;

    const fetchPost = async () => {
      try {
        const post = await getPostById(id!);

        setTitle(post.title);
        setContent(post.content);
        setCategory(post.category || categories[0]);
        setDistrictIds(post.districtIds ?? []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        alert('文章載入失敗');
        navigate('/');
      }
    };

    fetchPost();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      alert('你沒有權限修改文章');
      return;
    }

    try {
      const updatedPost = await updatePost(id!, {
        title,
        content,
        category,
        districtIds,
      });

      if (setPosts) {
        setPosts(prev =>
          prev.map(p => (p.id === updatedPost.id ? updatedPost : p))
        );
      }

      alert('文章修改成功');
      navigate(searchParams.get('from') === 'map'
        ? getTravelMapPath(searchParams.get('district'))
        : `/post/${id}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || '修改文章失敗');
    }
  };


  if (!isAdmin) {
    return <p className="post-editor-message">你沒有權限修改文章</p>;
  }

  if (loading) return <p className="post-editor-message">載入中...</p>;

  return (
    <div className="post-editor-page">
      <h2>修改文章</h2>
      <form onSubmit={handleSubmit} className="post-editor-form">
        <label>標題</label>
        <input
          className="post-editor-field"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
        <label>類別</label>
        <select
          className="post-editor-field"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <DistrictPicker value={districtIds} onChange={setDistrictIds} />
        <label>內容</label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          onUploadImage={uploadImageToCloudinary}
        />
        <button
          type="submit"
          className="post-editor-submit post-editor-submit-edit"
        >
          確認修改
        </button>
      </form>
    </div>
  );
};

export default EditPostPage;
