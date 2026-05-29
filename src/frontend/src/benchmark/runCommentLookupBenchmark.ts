import type { Comment } from '../api/comments_api';
import { buildCommentIndex } from '../utils/commentIndex';

function measure<T>(fn: () => T, repeat = 10) {
  let total = 0;
  let result!: T;

  for (let i = 0; i < repeat; i++) {
    const t1 = performance.now();
    result = fn();
    const t2 = performance.now();
    total += t2 - t1;
  }

  return {
    time: total / repeat,
    result,
  };
}

function generateComments(totalPosts: number): Comment[] {
  const rootCount = Math.max(100, totalPosts * 20);
  const repliesPerRoot = 4;
  const comments: Comment[] = [];
  let nextId = 1;

  for (let i = 0; i < rootCount; i++) {
    const rootId = nextId++;

    comments.push({
      id: rootId,
      post_id: 1,
      user_id: 1,
      content: `Root comment ${rootId}`,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      username: 'benchmark-user',
    });

    for (let j = 0; j < repliesPerRoot; j++) {
      const replyId = nextId++;
      const replyToId = j === 0 ? rootId : replyId - 1;

      comments.push({
        id: replyId,
        post_id: 1,
        user_id: 2,
        parent_comment_id: rootId,
        reply_to_comment_id: replyToId,
        reply_to_parent_comment_id: replyToId === rootId ? null : rootId,
        content: `Reply comment ${replyId}`,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        username: 'benchmark-reply-user',
      });
    }
  }

  return comments;
}

export function runCommentLookupBenchmark(totalPosts: number) {
  const comments = generateComments(totalPosts);
  const lookupCount = 10000;
  const lookupIds = Array.from({ length: lookupCount }, (_, index) => {
    return ((index * 97) % comments.length) + 1;
  });
  const updateCount = 5000;
  const updateIds = Array.from({ length: updateCount }, (_, index) => {
    return ((index * 131) % comments.length) + 1;
  });

  const index = buildCommentIndex(comments);

  const linear = measure(() => {
    let found = 0;

    lookupIds.forEach((id) => {
      if (comments.find((comment) => comment.id === id)) found += 1;
    });

    return found;
  });

  const hashMap = measure(() => {
    let found = 0;

    lookupIds.forEach((id) => {
      if (index.byId.get(id)) found += 1;
    });

    return found;
  });

  const arrayUpdate = measure(() => {
    let nextComments = comments;

    updateIds.forEach((id, updateIndex) => {
      nextComments = nextComments.map((comment) =>
        comment.id === id
          ? { ...comment, content: `Updated ${updateIndex}` }
          : comment
      );
    });

    return nextComments.length;
  });

  const mapUpdate = measure(() => {
    const nextById = new Map(index.byId);

    updateIds.forEach((id, updateIndex) => {
      const comment = nextById.get(id);
      if (!comment) return;

      nextById.set(id, {
        ...comment,
        content: `Updated ${updateIndex}`,
      });
    });

    return nextById.size;
  });

  return {
    commentCount: comments.length,
    lookupCount,
    updateCount,
    linearTime: linear.time,
    hashMapTime: hashMap.time,
    speedup: linear.time / Math.max(hashMap.time, 0.001),
    arrayUpdateTime: arrayUpdate.time,
    mapUpdateTime: mapUpdate.time,
    updateSpeedup: arrayUpdate.time / Math.max(mapUpdate.time, 0.001),
    foundCount: hashMap.result,
  };
}
