import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PostsContext } from '../components/Layout';
import { createPost } from '../api/posts';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const CLOUD_NAME = "dkoc0xopr";
const UPLOAD_PRESET = "article_images";

async function uploadImageToCloudinary(file: File): Promise<string> {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(url, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url;
}

const modules = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
    handlers: {
      image: async function () {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
          if (input.files && input.files[0]) {
            const file = input.files[0];
            const imageUrl = await uploadImageToCloudinary(file);
            
            const range = this.quill.getSelection();
            this.quill.insertEmbed(range?.index ?? 0, 'image', imageUrl);
          }
        };
      }
    }
  }
};

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || user.role !== 'admin') {
      alert('只有 admin 可以新增文章');
      return;
    }

    try {
      const newPost = await createPost({
        title,
        content,
        category,
        user,
      });

      // 立即更新 Layout 的 posts state
      setPosts(prev => [...prev, newPost]);

      alert('文章新增成功！');
      navigate('/');
    } catch (err) {
      alert('新增文章失敗');
      console.error(err);
    }
  };

  if (!user || user.role !== 'admin') {
    return <p style={{ padding: '2rem' }}>你沒有權限新增文章</p>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <h2>新增文章</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>標題</label>
        <input
          placeholder="輸入文章標題"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          style={{ padding: '0.8rem', fontSize: '1.2rem', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <label>類別</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ padding: '0.8rem', fontSize: '1.1rem', borderRadius: '6px', border: '1px solid #ccc' }}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label>內容</label>
        <ReactQuill
          theme="snow"
          value={content}
          onChange={setContent}
          modules={modules}
          style={{ minHeight: '200px', marginBottom: '2rem' }}
        />
        <button type="submit" style={{ padding: '0.8rem', fontSize: '1.1rem', borderRadius: '6px', border: 'none', backgroundColor: '#C68642', color: 'white', cursor: 'pointer' }}>
          送出
        </button>
      </form>
    </div>
  );
};

export default NewPostPage;