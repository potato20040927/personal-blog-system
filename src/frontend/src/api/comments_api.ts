import { apiClient } from './client';

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  parent_comment_id?: number | null;
  reply_to_comment_id?: number | null;
  reply_to_parent_comment_id?: number | null;
  reply_to_username?: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  username: string;
}

export const getComments = (postId: number | string) => {
  return apiClient<Comment[]>(`/posts/${postId}/comments`);
};

export const createComment = (
  postId: number | string,
  content: string,
  replyToCommentId?: number | string | null
) => {
  return apiClient<Comment>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: {
      content,
      ...(replyToCommentId ? { reply_to_comment_id: replyToCommentId } : {}),
    },
  });
};

export const updateComment = (commentId: number | string, content: string) => {
  return apiClient<Comment>(`/comments/${commentId}`, {
    method: 'PUT',
    body: { content },
  });
};

export const deleteComment = (commentId: number | string) => {
  return apiClient<{ message: string; softDeleted?: boolean }>(`/comments/${commentId}`, {
    method: 'DELETE',
  });
};
