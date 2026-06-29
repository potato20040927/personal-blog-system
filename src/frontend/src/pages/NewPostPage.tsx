import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PostsContext } from '../components/Layout';
import { createPost } from '../api/posts';
import RichTextEditor from '../components/RichTextEditor';
import { uploadImageToCloudinary } from '../utils/uploadImageToCloudinary';
import './PostEditorPage.css';

const categories = ['旅遊', '日記', '閒聊'];

const NewPostPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const context = useContext(PostsContext);
  if (!context) throw new Error('PostsContext 未提供');

  const { setPosts } = context;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories[0]);

  const isAdmin = user?.role === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      alert('只有 admin 可以新增文章');
      return;
    }

    try {
      const newPost = await createPost({
        title,
        content,
        category,
      });

      setPosts(prev => [...prev, newPost]);

      alert('文章新增成功！');
      navigate('/');
    } catch (err) {
      alert('新增文章失敗');
      console.error(err);
    }
  };

  if (!isAdmin) {
    return <p className="post-editor-message">你沒有權限新增文章</p>;
  }

  return (
    <div className="post-editor-page">
      <h2>新增文章</h2>
      <form onSubmit={handleSubmit} className="post-editor-form">
        <label>標題</label>
        <input
          className="post-editor-field"
          placeholder="輸入文章標題"
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
        <label>內容</label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          onUploadImage={uploadImageToCloudinary}
        />
        <button type="submit" className="post-editor-submit post-editor-submit-new">
          送出
        </button>
      </form>
    </div>
  );
};

export default NewPostPage;
