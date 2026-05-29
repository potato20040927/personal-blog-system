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
