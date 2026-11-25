export interface Post {
  id: number;
  title: string;
  content: string;
  category?: string;
  districtIds?: string[];
  createdAt: string;
  updatedAt: string;
  likeCount: number;
}
