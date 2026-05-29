import { describe, expect, it } from 'vitest';
import type { Comment } from '../../api/comments_api';
import {
  buildCommentIndex,
  createEmptyCommentStore,
  removeCommentFromStore,
  upsertCommentInStore,
} from '../../utils/commentIndex';

const makeComment = (overrides: Partial<Comment>): Comment => ({
  id: 1,
  post_id: 10,
  user_id: 1,
  username: 'alice',
  content: 'comment',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('commentIndex', () => {
  it('建立 root/reply 索引與樓層 map', () => {
    const store = buildCommentIndex([
      makeComment({ id: 1, content: 'B1' }),
      makeComment({ id: 2, content: 'B2' }),
      makeComment({
        id: 3,
        parent_comment_id: 1,
        reply_to_comment_id: 1,
        content: 'B1-1',
      }),
      makeComment({
        id: 4,
        parent_comment_id: 1,
        reply_to_comment_id: 3,
        reply_to_parent_comment_id: 1,
        content: 'B1-2',
      }),
    ]);

    expect(store.byId.get(4)?.content).toBe('B1-2');
    expect(store.rootIds).toEqual([1, 2]);
    expect(store.repliesByRootId.get(1)).toEqual([3, 4]);
    expect(store.rootFloorById.get(1)).toBe(1);
    expect(store.rootFloorById.get(2)).toBe(2);
    expect(store.replyFloorById.get(3)).toBe(1);
    expect(store.replyFloorById.get(4)).toBe(2);
  });

  it('upsert 新增 root 與 reply 時更新 id lists', () => {
    let store = createEmptyCommentStore();

    store = upsertCommentInStore(store, makeComment({ id: 1 }));
    store = upsertCommentInStore(
      store,
      makeComment({
        id: 2,
        parent_comment_id: 1,
        reply_to_comment_id: 1,
      })
    );

    expect(store.rootIds).toEqual([1]);
    expect(store.repliesByRootId.get(1)).toEqual([2]);
    expect(store.rootFloorById.get(1)).toBe(1);
    expect(store.replyFloorById.get(2)).toBe(1);
  });

  it('upsert 既有留言只更新 byId，不重複加入 id lists', () => {
    let store = buildCommentIndex([
      makeComment({ id: 1 }),
      makeComment({ id: 2, parent_comment_id: 1, reply_to_comment_id: 1 }),
    ]);

    store = upsertCommentInStore(
      store,
      makeComment({
        id: 2,
        parent_comment_id: 1,
        reply_to_comment_id: 1,
        content: 'updated',
      })
    );

    expect(store.byId.get(2)?.content).toBe('updated');
    expect(store.rootIds).toEqual([1]);
    expect(store.repliesByRootId.get(1)).toEqual([2]);
  });

  it('remove reply/root 時同步更新索引', () => {
    let store = buildCommentIndex([
      makeComment({ id: 1 }),
      makeComment({ id: 2 }),
      makeComment({ id: 3, parent_comment_id: 1, reply_to_comment_id: 1 }),
    ]);

    store = removeCommentFromStore(store, 3);
    expect(store.byId.has(3)).toBe(false);
    expect(store.repliesByRootId.has(1)).toBe(false);

    store = removeCommentFromStore(store, 1);
    expect(store.byId.has(1)).toBe(false);
    expect(store.rootIds).toEqual([2]);
    expect(store.rootFloorById.get(2)).toBe(1);
  });
});
