import type { Comment } from '../api/comments_api';

export interface CommentIndex {
  byId: Map<number, Comment>;
  rootIds: number[];
  repliesByRootId: Map<number, number[]>;
  rootFloorById: Map<number, number>;
  replyFloorById: Map<number, number>;
}

export type CommentStore = CommentIndex;

export const getRootId = (comment: Comment) => comment.parent_comment_id ?? comment.id;

function rebuildFloors(
  rootIds: number[],
  repliesByRootId: Map<number, number[]>
) {
  const rootFloorById = new Map<number, number>();
  const replyFloorById = new Map<number, number>();

  rootIds.forEach((id, index) => {
    rootFloorById.set(id, index + 1);
  });

  repliesByRootId.forEach((replyIds) => {
    replyIds.forEach((id, index) => {
      replyFloorById.set(id, index + 1);
    });
  });

  return {
    rootFloorById,
    replyFloorById,
  };
}

export function createEmptyCommentStore(): CommentStore {
  return {
    byId: new Map(),
    rootIds: [],
    repliesByRootId: new Map(),
    rootFloorById: new Map(),
    replyFloorById: new Map(),
  };
}

export function buildCommentIndex(comments: Comment[]): CommentStore {
  const byId = new Map<number, Comment>();
  const rootIds: number[] = [];
  const repliesByRootId = new Map<number, number[]>();

  comments.forEach((comment) => {
    byId.set(comment.id, comment);

    if (!comment.parent_comment_id) {
      rootIds.push(comment.id);
      return;
    }

    const replies = repliesByRootId.get(comment.parent_comment_id);
    if (replies) {
      replies.push(comment.id);
    } else {
      repliesByRootId.set(comment.parent_comment_id, [comment.id]);
    }
  });

  const { rootFloorById, replyFloorById } = rebuildFloors(rootIds, repliesByRootId);

  return {
    byId,
    rootIds,
    repliesByRootId,
    rootFloorById,
    replyFloorById,
  };
}

export function upsertCommentInStore(
  store: CommentStore,
  nextComment: Comment
): CommentStore {
  const existing = store.byId.get(nextComment.id);
  const byId = new Map(store.byId);
  const rootIds = [...store.rootIds];
  const repliesByRootId = new Map(
    Array.from(store.repliesByRootId.entries()).map(([rootId, replyIds]) => [
      rootId,
      [...replyIds],
    ])
  );

  byId.set(nextComment.id, nextComment);

  if (!existing) {
    if (!nextComment.parent_comment_id) {
      rootIds.push(nextComment.id);
    } else {
      const replies = repliesByRootId.get(nextComment.parent_comment_id) || [];
      if (!replies.includes(nextComment.id)) {
        replies.push(nextComment.id);
      }
      repliesByRootId.set(nextComment.parent_comment_id, replies);
    }
  }

  const needsFloorRebuild =
    !existing ||
    existing.parent_comment_id !== nextComment.parent_comment_id;
  const floors = needsFloorRebuild
    ? rebuildFloors(rootIds, repliesByRootId)
    : {
        rootFloorById: store.rootFloorById,
        replyFloorById: store.replyFloorById,
      };

  return {
    byId,
    rootIds,
    repliesByRootId,
    ...floors,
  };
}

export function removeCommentFromStore(
  store: CommentStore,
  commentId: number
): CommentStore {
  const existing = store.byId.get(commentId);
  if (!existing) return store;

  const byId = new Map(store.byId);
  byId.delete(commentId);

  let rootIds = store.rootIds;
  const repliesByRootId = new Map(
    Array.from(store.repliesByRootId.entries()).map(([rootId, replyIds]) => [
      rootId,
      [...replyIds],
    ])
  );

  if (!existing.parent_comment_id) {
    rootIds = store.rootIds.filter((id) => id !== commentId);
    repliesByRootId.delete(commentId);
  } else {
    const replies = repliesByRootId
      .get(existing.parent_comment_id)
      ?.filter((id) => id !== commentId);

    if (replies && replies.length > 0) {
      repliesByRootId.set(existing.parent_comment_id, replies);
    } else {
      repliesByRootId.delete(existing.parent_comment_id);
    }
  }

  const { rootFloorById, replyFloorById } = rebuildFloors(rootIds, repliesByRootId);

  return {
    byId,
    rootIds,
    repliesByRootId,
    rootFloorById,
    replyFloorById,
  };
}
