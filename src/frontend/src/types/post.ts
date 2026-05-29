export interface Post {
  id: number;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
}
