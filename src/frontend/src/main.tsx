import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';
import Layout from './components/Layout';
import PostDetail from './pages/PostDetail';
import LoginPage from './pages/LoginPage';
import NewPostPage from './pages/NewPostPage';
import EditPostPage from './pages/EditPostPage';
import BenchmarkPage from './pages/BenchmarkPage';
import { AuthProvider } from './context/AuthContext';
import RegisterPage from './pages/RegisterPage';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<App />} />
            <Route path="post/:id" element={<PostDetail />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="new" element={<NewPostPage />} />
            <Route path="post/:id/edit" element={<EditPostPage />} />
            <Route path="benchmark" element={<BenchmarkPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);