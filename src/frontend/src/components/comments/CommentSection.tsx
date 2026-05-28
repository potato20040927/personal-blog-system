import React, { useEffect, useState } from 'react';
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
  type Comment,
} from '../../api/comments_api';
import { useAuth } from '../../context/AuthContext';

interface CommentSectionProps {
  postId: number;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const CommentSection: React.FC<CommentSectionProps> = ({ postId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchComments = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getComments(postId);
        if (!cancelled) setComments(data);
      } catch (err) {
        if (!cancelled) setError('留言載入失敗');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchComments();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const newComment = await createComment(postId, trimmedContent);
      setComments((prev) => [...prev, newComment]);
      setContent('');
    } catch (err) {
      setError('留言送出失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    const confirmDelete = window.confirm('確定要刪除這則留言嗎？');
    if (!confirmDelete) return;

    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (err) {
      setError('留言刪除失敗');
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingId(comment.id);
    setEditingContent(comment.content);
    setError('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const handleUpdate = async (event: React.FormEvent, commentId: number) => {
    event.preventDefault();

    const trimmedContent = editingContent.trim();
    if (!trimmedContent || savingEdit) return;

    setSavingEdit(true);
    setError('');

    try {
      const updatedComment = await updateComment(commentId, trimmedContent);
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? updatedComment : comment
        )
      );
      cancelEditing();
    } catch (err) {
      setError('留言更新失敗，請稍後再試');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <section className="comment-section" aria-labelledby="comment-section-title">
      <h2 id="comment-section-title">留言</h2>

      {user ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="留下你的想法..."
            rows={4}
          />
          <div className="comment-form-actions">
            <button type="submit" disabled={!content.trim() || submitting}>
              {submitting ? '送出中...' : '送出留言'}
            </button>
          </div>
        </form>
      ) : (
        <p className="comment-login-hint">登入後即可留言。</p>
      )}

      {error && <p className="comment-error">{error}</p>}

      {loading ? (
        <p className="comment-empty">留言載入中...</p>
      ) : comments.length === 0 ? (
        <p className="comment-empty">目前還沒有留言。</p>
      ) : (
        <ul className="comment-list">
          {comments.map((comment) => {
            const canManage = user?.username === comment.username;
            const isEditing = editingId === comment.id;

            return (
              <li key={comment.id} className="comment-item">
                <div className="comment-meta">
                  <strong>{comment.username || '匿名使用者'}</strong>
                  <span>{formatDate(comment.createdAt)}</span>
                  {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                    <span>已編輯</span>
                  )}
                </div>

                {isEditing ? (
                  <form className="comment-form comment-edit-form" onSubmit={(event) => handleUpdate(event, comment.id)}>
                    <textarea
                      value={editingContent}
                      onChange={(event) => setEditingContent(event.target.value)}
                      rows={4}
                    />
                    <div className="comment-form-actions">
                      <button type="button" className="comment-secondary" onClick={cancelEditing}>
                        取消
                      </button>
                      <button type="submit" disabled={!editingContent.trim() || savingEdit}>
                        {savingEdit ? '儲存中...' : '儲存'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p>{comment.content}</p>
                )}

                {canManage && !isEditing && (
                  <div className="comment-actions">
                    <button
                      type="button"
                      className="comment-edit"
                      onClick={() => startEditing(comment)}
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      className="comment-delete"
                      onClick={() => handleDelete(comment.id)}
                    >
                      刪除
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default CommentSection;
