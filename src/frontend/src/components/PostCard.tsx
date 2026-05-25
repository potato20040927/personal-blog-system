import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface Post {
  id: number;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

interface PostCardProps {
  post: Post;
  maxContentLines?: number;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '');
}


const PostCard: React.FC<PostCardProps> = ({ post, maxContentLines = 3 }) => {
  const navigate = useNavigate();

  return (
    <div
      style={styles.card}
      onClick={() => navigate(`/post/${post.id}`)}
    >
      <h2 style={styles.title}>{post.title}</h2>
      <p style={{ ...styles.content, WebkitLineClamp: maxContentLines }}>
        {stripHtml(post.content)}
      </p>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#F5DEB3',
    padding: '1rem',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    marginBottom: '1rem',
    color: 'black',
    cursor: 'pointer',
  },
  title: {
    display: 'block',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    margin: '0 0 0.5rem 0',
  },
  content: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    margin: 0,
  },
} as const;

export default PostCard;