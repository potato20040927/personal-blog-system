import { apiClient } from './client';
import type { Post } from '../components/PostCard';

export const getPosts = () => {
  return apiClient<Post[]>('/posts');
};

export const getPostById = (id: string | number) => {
  return apiClient<Post>(`/posts/${id}`);
};

export const createPost = (data: {
  title: string;
  content: string;
  category: string;
}) => {
  return apiClient<Post>('/posts', {
    method: 'POST',
    body: data,
  });
};

export const updatePost = (
  id: string | number,
  data: {
    title: string;
    content: string;
    category: string;
  }
) => {
  return apiClient<Post>(`/posts/${id}`, {
    method: 'PUT',
    body: data,
  });
};

export const deletePost = (id: string | number) => {
  return apiClient<{ message: string }>(`/posts/${id}/delete`, {
    method: 'POST',
  });
};