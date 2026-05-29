import { useEffect, useState, type FormEvent } from 'react';
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
} from '../api/comments_api';
import { API_BASE_URL } from '../api/config';
import type { Comment } from '../types/comment';
import {
  buildCommentIndex,
  createEmptyCommentStore,
  getRootId,
  removeCommentFromStore,
  upsertCommentInStore,
} from '../utils/commentIndex';

export function useComments(postId: number) {
  const [commentStore, setCommentStore] = useState(createEmptyCommentStore);
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

  const upsertComment = (nextComment: Comment) => {
    setCommentStore((prev) => upsertCommentInStore(prev, nextComment));
  };

  const removeComment = (commentId: number) => {
    setCommentStore((prev) => removeCommentFromStore(prev, commentId));
  };

  const getFloorLabel = (comment: Comment) => {
    const rootId = getRootId(comment);
    const rootFloor = commentStore.rootFloorById.get(rootId);

    if (!comment.parent_comment_id) return `B${rootFloor}`;
    return `B${rootFloor}-${commentStore.replyFloorById.get(comment.id)}`;
  };

  const getReplyTargetLabel = (comment: Comment) => {
    if (!comment.reply_to_comment_id) return '';

    const targetRootId = comment.reply_to_parent_comment_id ?? comment.reply_to_comment_id;
    const rootFloor = commentStore.rootFloorById.get(targetRootId);
    if (!rootFloor) return '';

    if (!comment.reply_to_parent_comment_id) return `B${rootFloor}`;
    return `B${rootFloor}-${commentStore.replyFloorById.get(comment.reply_to_comment_id)}`;
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
      const targetComment = commentStore.byId.get(commentId);
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
        if (!cancelled) setCommentStore(buildCommentIndex(data));
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

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;

    const eventSource = new EventSource(`${API_BASE_URL}/events`);

    const handleCommentCreated = (event: MessageEvent) => {
      const payload = JSON.parse(event.data);
      if (Number(payload.postId) !== postId || !payload.comment) return;

      upsertComment(payload.comment);
      if (payload.comment.parent_comment_id) {
        setExpandedRootIds((prev) => new Set(prev).add(payload.comment.parent_comment_id));
      }
    };

    const handleCommentUpdated = (event: MessageEvent) => {
      const payload = JSON.parse(event.data);
      if (Number(payload.postId) !== postId || !payload.comment) return;
      upsertComment(payload.comment);
    };

    const handleCommentDeleted = (event: MessageEvent) => {
      const payload = JSON.parse(event.data);
      if (Number(payload.postId) !== postId) return;

      if (payload.softDeleted && payload.comment) {
        upsertComment(payload.comment);
      } else if (payload.id) {
        removeComment(Number(payload.id));
      }
    };

    eventSource.addEventListener('commentCreated', handleCommentCreated);
    eventSource.addEventListener('commentUpdated', handleCommentUpdated);
    eventSource.addEventListener('commentDeleted', handleCommentDeleted);

    return () => {
      eventSource.removeEventListener('commentCreated', handleCommentCreated);
      eventSource.removeEventListener('commentUpdated', handleCommentUpdated);
      eventSource.removeEventListener('commentDeleted', handleCommentDeleted);
      eventSource.close();
    };
  }, [postId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const newComment = await createComment(postId, trimmedContent);
      upsertComment(newComment);
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
      if (!result.softDeleted) {
        removeComment(commentId);
        return;
      }

      const currentComment = commentStore.byId.get(commentId);
      if (currentComment) {
        upsertComment({
          ...currentComment,
          content: '[留言已刪除]',
          deletedAt: new Date().toISOString(),
        });
      }
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

  const handleUpdate = async (event: FormEvent, commentId: number) => {
    event.preventDefault();

    const trimmedContent = editingContent.trim();
    if (!trimmedContent || savingEdit) return;

    setSavingEdit(true);
    setError('');

    try {
      const updatedComment = await updateComment(commentId, trimmedContent);
      upsertComment(updatedComment);
      cancelEditing();
    } catch (err) {
      setError('留言更新失敗，請稍後再試');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReply = async (event: FormEvent, replyToCommentId: number) => {
    event.preventDefault();

    const trimmedContent = replyContent.trim();
    if (!trimmedContent || submittingReply) return;

    setSubmittingReply(true);
    setError('');

    try {
      const newComment = await createComment(postId, trimmedContent, replyToCommentId);
      upsertComment(newComment);
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

  return {
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
  };
}
