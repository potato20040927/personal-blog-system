import type { Post } from '../components/PostCard';

export class TopKHeapManager {
  private heap: Post[] = [];
  private indexMap: Map<number, number> = new Map();
  private k: number;

  constructor(k: number = 10) {
    this.k = k;
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
  // rebuild (initial sync only)
  // =========================
  build(posts: Post[]) {
    this.heap = [];
    this.indexMap.clear();

    for (const post of posts) {
      this.insert(post);
    }
  }

  // =========================
  // INSERT (O log K)
  // =========================
  insert(post: Post) {
    // if already in heap → treat as update
    if (this.indexMap.has(post.id)) {
      this.update(post);
      return;
    }

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
  // UPDATE (O log K)
  // =========================
  update(post: Post) {
    const i = this.indexMap.get(post.id);

    // already in heap
    if (i !== undefined) {
      this.heap[i] = post;

      this.heapifyDown(i);
      this.heapifyUp(i);

      return;
    }

    // not in heap → try insert
    this.insert(post);
  }

  // =========================
  // REMOVE (O log K)
  // =========================
  remove(post: Post) {
    const i = this.indexMap.get(post.id);
    if (i === undefined) return;

    const last = this.heap.length - 1;

    this.swap(i, last);

    const removed = this.heap.pop();
    if (!removed) return;

    this.indexMap.delete(removed.id);

    // fix moved node
    if (i < this.heap.length) {
      this.indexMap.set(this.heap[i].id, i);
      this.heapifyDown(i);
      this.heapifyUp(i);
    }
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