import { Link } from 'react-router-dom';
import type { Post } from '../types/post';
import './PostCard.css';

export type { Post } from '../types/post';

interface PostCardProps {
  post: Post;
  maxContentLines?: number;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '');
}


export default function PostCard({ post, maxContentLines = 3 }: PostCardProps) {
  return (
    <Link className="post-card" to={`/post/${post.id}`} aria-label={post.title}>
      <div className="post-card-text">
        <h2 className="post-card-title">{post.title}</h2>
        <p className="post-card-preview" style={{ WebkitLineClamp: maxContentLines }}>
          {stripHtml(post.content)}
        </p>
      </div>
    </Link>
  );
}
