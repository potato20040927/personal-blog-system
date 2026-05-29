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

const getRootId = (comment: Comment) => comment.parent_comment_id ?? comment.id;

const CommentSection: React.FC<CommentSectionProps> = ({ postId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [expandedRootIds, setExpandedRootIds] = useState<Set<number>>(new Set());
  const [highlightedCommentId, setHighlightedCommentId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const rootComments = comments.filter((comment) => !comment.parent_comment_id);
  const repliesByRootId = comments.reduce<Record<number, Comment[]>>((groups, comment) => {
    if (!comment.parent_comment_id) return groups;

    const rootId = comment.parent_comment_id;
    groups[rootId] = [...(groups[rootId] || []), comment];
    return groups;
  }, {});

  const rootFloorById = rootComments.reduce<Record<number, number>>((map, comment, index) => {
    map[comment.id] = index + 1;
    return map;
  }, {});

  const replyFloorById = Object.entries(repliesByRootId).reduce<Record<number, number>>(
    (map, [, replies]) => {
      replies.forEach((reply, index) => {
        map[reply.id] = index + 1;
      });
      return map;
    },
    {}
  );

  const getFloorLabel = (comment: Comment) => {
    const rootId = getRootId(comment);
    const rootFloor = rootFloorById[rootId];

    if (!comment.parent_comment_id) return `B${rootFloor}`;
    return `B${rootFloor}-${replyFloorById[comment.id]}`;
  };

  const getReplyTargetLabel = (comment: Comment) => {
    if (!comment.reply_to_comment_id) return '';

    const targetRootId = comment.reply_to_parent_comment_id ?? comment.reply_to_comment_id;
    const rootFloor = rootFloorById[targetRootId];
    if (!rootFloor) return '';

    if (!comment.reply_to_parent_comment_id) return `B${rootFloor}`;
    return `B${rootFloor}-${replyFloorById[comment.reply_to_comment_id]}`;
  };

  const toggleReplies = (rootId: number) => {
    setExpandedRootIds((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) {
        next.delete(rootId);
      } else {
        next.add(rootId);
      }
      return next;
    });
  };

  const focusComment = (commentId: number) => {
    setExpandedRootIds((prev) => {
      const targetComment = comments.find((comment) => comment.id === commentId);
      if (!targetComment?.parent_comment_id) return prev;

      const next = new Set(prev);
      next.add(targetComment.parent_comment_id);
      return next;
    });

    setHighlightedCommentId(commentId);

    const scheduleFrame =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback: FrameRequestCallback) => window.setTimeout(callback, 0);

    scheduleFrame(() => {
      const element = document.getElementById(`comment-${commentId}`);
      element?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    });

    window.setTimeout(() => {
      setHighlightedCommentId((currentId) => (currentId === commentId ? null : currentId));
    }, 1600);
  };

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
      const result = await deleteComment(commentId);
      setComments((prev) => {
        if (!result.softDeleted) {
          return prev.filter((comment) => comment.id !== commentId);
        }

        return prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                content: '[留言已刪除]',
                deletedAt: new Date().toISOString(),
              }
            : comment
        );
      });
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

  const startReplying = (comment: Comment) => {
    setReplyingToId(comment.id);
    setReplyContent('');
    setError('');
  };

  const cancelReplying = () => {
    setReplyingToId(null);
    setReplyContent('');
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

  const handleReply = async (event: React.FormEvent, replyToCommentId: number) => {
    event.preventDefault();

    const trimmedContent = replyContent.trim();
    if (!trimmedContent || submittingReply) return;

    setSubmittingReply(true);
    setError('');

    try {
      const newComment = await createComment(postId, trimmedContent, replyToCommentId);
      setComments((prev) => [...prev, newComment]);
      if (newComment.parent_comment_id) {
        setExpandedRootIds((prev) => new Set(prev).add(newComment.parent_comment_id!));
      }
      cancelReplying();
    } catch (err) {
      setError('回覆送出失敗，請稍後再試');
    } finally {
      setSubmittingReply(false);
    }
  };

  const renderReplyForm = (comment: Comment) => (
    <form className="comment-form comment-reply-form" onSubmit={(event) => handleReply(event, comment.id)}>
      <textarea
        value={replyContent}
        onChange={(event) => setReplyContent(event.target.value)}
        placeholder={`回覆 ${getFloorLabel(comment)}...`}
        rows={3}
      />
      <div className="comment-form-actions">
        <button type="button" className="comment-secondary" onClick={cancelReplying}>
          取消
        </button>
        <button type="submit" disabled={!replyContent.trim() || submittingReply}>
          {submittingReply ? '送出中...' : '送出回覆'}
        </button>
      </div>
    </form>
  );

  const renderComment = (comment: Comment, variant: 'root' | 'reply') => {
    const canManage = user?.username === comment.username && !comment.deletedAt;
    const canReply = !!user && !comment.deletedAt;
    const isEditing = editingId === comment.id;
    const isReplying = replyingToId === comment.id;
    const replyTargetLabel = getReplyTargetLabel(comment);
    const isHighlighted = highlightedCommentId === comment.id;
    const replies = variant === 'root' ? repliesByRootId[comment.id] || [] : [];
    const hasReplies = replies.length > 0;
    const isExpanded = expandedRootIds.has(comment.id);

    return (
      <li
        id={`comment-${comment.id}`}
        key={comment.id}
        className={[
          'comment-item',
          variant === 'reply' ? 'comment-reply-item' : '',
          isHighlighted ? 'comment-highlight' : '',
        ].filter(Boolean).join(' ')}
      >
        <div className="comment-meta">
          <strong>{getFloorLabel(comment)}</strong>
          <strong>{comment.username || '匿名使用者'}</strong>
          <span>{formatDate(comment.createdAt)}</span>
          {comment.updatedAt && comment.updatedAt !== comment.createdAt && !comment.deletedAt && (
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
          <p className={comment.deletedAt ? 'comment-deleted' : undefined}>
            {variant === 'reply' && replyTargetLabel && (
              <button
                type="button"
                className="comment-reply-target"
                onClick={() => focusComment(comment.reply_to_comment_id!)}
              >
                {replyTargetLabel}
              </button>
            )}
            {comment.content}
          </p>
        )}

        {!isEditing && (
          <div className="comment-footer">
            {hasReplies ? (
              <button
                type="button"
                className="comment-thread-toggle"
                onClick={() => toggleReplies(comment.id)}
              >
                {isExpanded ? '收合回覆' : `查看其他${replies.length}則留言`}
              </button>
            ) : (
              <span />
            )}

            <div className="comment-actions">
              {canReply && (
                <button
                  type="button"
                  className="comment-reply"
                  onClick={() => startReplying(comment)}
                >
                  回覆
                </button>
              )}
              {canManage && (
                <>
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
                </>
              )}
            </div>
          </div>
        )}

        {isReplying && renderReplyForm(comment)}
      </li>
    );
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
      ) : rootComments.length === 0 ? (
        <p className="comment-empty">目前還沒有留言。</p>
      ) : (
        <ul className="comment-list">
          {rootComments.map((comment) => (
            <li key={comment.id} className="comment-thread">
              <ul className="comment-thread-list">
                {renderComment(comment, 'root')}
                {expandedRootIds.has(comment.id) &&
                  (repliesByRootId[comment.id] || []).map((reply) =>
                    renderComment(reply, 'reply')
                  )}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default CommentSection;
