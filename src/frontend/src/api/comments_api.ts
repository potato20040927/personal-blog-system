import { apiClient } from './client';

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
  username: string;
}

export const getComments = (postId: number | string) => {
  return apiClient<Comment[]>(`/posts/${postId}/comments`);
};

export const createComment = (postId: number | string, content: string) => {
  return apiClient<Comment>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: { content },
  });
};

export const updateComment = (commentId: number | string, content: string) => {
  return apiClient<Comment>(`/comments/${commentId}`, {
    method: 'PUT',
    body: { content },
  });
};

export const deleteComment = (commentId: number | string) => {
  return apiClient<{ message: string }>(`/comments/${commentId}`, {
    method: 'DELETE',
  });
};
