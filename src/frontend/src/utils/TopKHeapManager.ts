import type { Post } from '../components/PostCard';

export class TopKHeapManager {
  private heap: Post[] = [];
  private indexMap: Map<number, number> = new Map();
  private postsById: Map<number, Post> = new Map();
  private k: number;

  constructor(k: number = 10) {
    this.k = k;
  }

  private normalizePost(post: Post): Post {
    return {
      ...post,
      likeCount: Number.isFinite(post.likeCount) ? post.likeCount : 0,
    };
  }

  // =========================
  // helper: index
  // =========================
  private parent(i: number) {
    return Math.floor((i - 1) / 2);
  }

  private left(i: number) {
    return i * 2 + 1;
  }

  private right(i: number) {
    return i * 2 + 2;
  }

  // =========================
  // swap (IMPORTANT: sync map)
  // =========================
  private swap(i: number, j: number) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];

    this.indexMap.set(this.heap[i].id, i);
    this.indexMap.set(this.heap[j].id, j);
  }

  // =========================
  // heapify up (min heap by likeCount)
  // =========================
  private heapifyUp(i: number) {
    while (
      i > 0 &&
      this.heap[this.parent(i)].likeCount > this.heap[i].likeCount
    ) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }

  // =========================
  // heapify down
  // =========================
  private heapifyDown(i: number) {
    let smallest = i;

    const l = this.left(i);
    const r = this.right(i);

    if (
      l < this.heap.length &&
      this.heap[l].likeCount < this.heap[smallest].likeCount
    ) {
      smallest = l;
    }

    if (
      r < this.heap.length &&
      this.heap[r].likeCount < this.heap[smallest].likeCount
    ) {
      smallest = r;
    }

    if (smallest !== i) {
      this.swap(i, smallest);
      this.heapifyDown(smallest);
    }
  }

  // =========================
  // rebuild from the current full post set
  // =========================
  build(posts: Post[]) {
    this.postsById.clear();
    posts.forEach(post => {
      const normalizedPost = this.normalizePost(post);
      this.postsById.set(normalizedPost.id, normalizedPost);
    });
    this.rebuildHeap();
  }

  private rebuildHeap() {
    this.heap = [];
    this.indexMap.clear();

    for (const post of this.postsById.values()) {
      this.insertIntoHeap(post);
    }
  }

  // =========================
  // INSERT into heap only (O log K)
  // =========================
  private insertIntoHeap(post: Post) {
    // heap not full
    if (this.heap.length < this.k) {
      this.heap.push(post);
      const i = this.heap.length - 1;

      this.indexMap.set(post.id, i);
      this.heapifyUp(i);
      return;
    }

    // not in top K
    if (post.likeCount <= this.heap[0].likeCount) return;

    // replace root (min)
    const removed = this.heap[0];
    this.indexMap.delete(removed.id);

    this.heap[0] = post;
    this.indexMap.set(post.id, 0);

    this.heapifyDown(0);
  }

  // =========================
  // INSERT post into tracked set and rebuild Top K
  // =========================
  insert(post: Post) {
    const normalizedPost = this.normalizePost(post);
    this.postsById.set(normalizedPost.id, normalizedPost);
    this.rebuildHeap();
  }

  // =========================
  // UPDATE tracked post and rebuild Top K from all known posts
  // =========================
  update(post: Post) {
    const normalizedPost = this.normalizePost(post);
    this.postsById.set(normalizedPost.id, normalizedPost);
    this.rebuildHeap();
  }

  // =========================
  // REMOVE tracked post and rebuild Top K
  // =========================
  remove(post: Post) {
    this.postsById.delete(post.id);
    this.rebuildHeap();
  }

  // =========================
  // OUTPUT Top K (sorted desc)
  // =========================
  getTopK(): Post[] {
    return [...this.heap].sort((a, b) => b.likeCount - a.likeCount);
  }

  // debug helper
  size() {
    return this.heap.length;
  }
}
