import React from 'react';
import CommentForm from './CommentForm';
import { useAuth } from '../context/AuthContext';
import { useComments } from '../hooks/useComments';
import type { Comment } from '../types/comment';

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
  const {
    cancelEditing,
    cancelReplying,
    commentStore,
    content,
    editingContent,
    editingId,
    error,
    expandedRootIds,
    focusComment,
    getFloorLabel,
    getReplyTargetLabel,
    handleDelete,
    handleReply,
    handleSubmit,
    handleUpdate,
    highlightedCommentId,
    loading,
    replyingToId,
    replyContent,
    savingEdit,
    setContent,
    setEditingContent,
    setReplyContent,
    startEditing,
    startReplying,
    submitting,
    submittingReply,
    toggleReplies,
  } = useComments(postId);

  const renderReplyForm = (comment: Comment) => (
    <CommentForm
      className="comment-form comment-reply-form"
      value={replyContent}
      onChange={setReplyContent}
      onSubmit={(event) => handleReply(event, comment.id)}
      placeholder={`回覆 ${getFloorLabel(comment)}...`}
      rows={3}
      submitLabel="送出回覆"
      submittingLabel="送出中..."
      submitting={submittingReply}
      onCancel={cancelReplying}
    />
  );

  const renderComment = (comment: Comment, variant: 'root' | 'reply') => {
    const canManage = user?.username === comment.username && !comment.deletedAt;
    const canReply = !!user && !comment.deletedAt;
    const isEditing = editingId === comment.id;
    const isReplying = replyingToId === comment.id;
    const replyTargetLabel = getReplyTargetLabel(comment);
    const isHighlighted = highlightedCommentId === comment.id;
    const replyIds = variant === 'root' ? commentStore.repliesByRootId.get(comment.id) || [] : [];
    const replies = replyIds
      .map((id) => commentStore.byId.get(id))
      .filter((reply): reply is Comment => !!reply);
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
          <CommentForm
            className="comment-form comment-edit-form"
            value={editingContent}
            onChange={setEditingContent}
            onSubmit={(event) => handleUpdate(event, comment.id)}
            rows={4}
            submitLabel="儲存"
            submittingLabel="儲存中..."
            submitting={savingEdit}
            onCancel={cancelEditing}
          />
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
        <CommentForm
          value={content}
          onChange={setContent}
          onSubmit={handleSubmit}
          placeholder="留下你的想法..."
          rows={4}
          submitLabel="送出留言"
          submittingLabel="送出中..."
          submitting={submitting}
        />
      ) : (
        <p className="comment-login-hint">登入後即可留言。</p>
      )}

      {error && <p className="comment-error">{error}</p>}

      {loading ? (
        <p className="comment-empty">留言載入中...</p>
      ) : commentStore.rootIds.length === 0 ? (
        <p className="comment-empty">目前還沒有留言。</p>
      ) : (
        <ul className="comment-list">
          {commentStore.rootIds.map((commentId) => {
            const comment = commentStore.byId.get(commentId);
            if (!comment) return null;

            return (
              <li key={comment.id} className="comment-thread">
                <ul className="comment-thread-list">
                  {renderComment(comment, 'root')}
                  {expandedRootIds.has(comment.id) &&
                    (commentStore.repliesByRootId.get(comment.id) || []).map((replyId) => {
                      const reply = commentStore.byId.get(replyId);
                      return reply ? renderComment(reply, 'reply') : null;
                    })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default CommentSection;
