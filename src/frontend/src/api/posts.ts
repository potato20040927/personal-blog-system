import { apiClient } from './client';
import type { Post } from '../types/post';

export const getPosts = (signal?: AbortSignal) => {
  return apiClient<Post[]>('/posts', { signal });
};

export const getPostById = (id: string | number) => {
  return apiClient<Post>(`/posts/${id}`);
};

type PostInput = {
  title: string;
  content: string;
  category: string;
  districtIds?: string[];
};

export const createPost = (data: PostInput) => {
  return apiClient<Post>('/posts', {
    method: 'POST',
    body: data,
  });
};

export const updatePost = (
  id: string | number,
  data: PostInput
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

export const toggleLike = (id: number | string) => {
  return apiClient<{ liked: boolean; count: number }>(
    `/posts/${id}/like`,
    {
      method: 'POST',
    }
  );
};

export const getLikeStatus = (id: number | string) => {
  return apiClient<{ liked: boolean; count: number }>(
    `/posts/${id}/like-status`
  );
};
