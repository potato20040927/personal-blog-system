import type { Post } from '../types/post';

type HeapLocation = 'top' | 'rest';

export class TopKHeapManager {
  private topHeap: Post[] = [];
  private restHeap: Post[] = [];
  private topIndexMap: Map<number, number> = new Map();
  private restIndexMap: Map<number, number> = new Map();
  private locationById: Map<number, HeapLocation> = new Map();
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

  private parent(i: number) {
    return Math.floor((i - 1) / 2);
  }

  private left(i: number) {
    return i * 2 + 1;
  }

  private right(i: number) {
    return i * 2 + 2;
  }

  private isWorseTopCandidate(a: Post, b: Post) {
    if (a.likeCount !== b.likeCount) return a.likeCount < b.likeCount;
    return a.id > b.id;
  }

  private isBetterRestCandidate(a: Post, b: Post) {
    if (a.likeCount !== b.likeCount) return a.likeCount > b.likeCount;
    return a.id < b.id;
  }

  private sortByLikesDesc(a: Post, b: Post) {
    if (a.likeCount !== b.likeCount) return b.likeCount - a.likeCount;
    return a.id - b.id;
  }

  private swap(heap: Post[], indexMap: Map<number, number>, i: number, j: number) {
    [heap[i], heap[j]] = [heap[j], heap[i]];
    indexMap.set(heap[i].id, i);
    indexMap.set(heap[j].id, j);
  }

  private heapifyUp(
    heap: Post[],
    indexMap: Map<number, number>,
    i: number,
    shouldComeBefore: (a: Post, b: Post) => boolean
  ) {
    while (i > 0 && shouldComeBefore(heap[i], heap[this.parent(i)])) {
      const parent = this.parent(i);
      this.swap(heap, indexMap, i, parent);
      i = parent;
    }
  }

  private heapifyDown(
    heap: Post[],
    indexMap: Map<number, number>,
    i: number,
    shouldComeBefore: (a: Post, b: Post) => boolean
  ) {
    let selected = i;
    const l = this.left(i);
    const r = this.right(i);

    if (l < heap.length && shouldComeBefore(heap[l], heap[selected])) {
      selected = l;
    }

    if (r < heap.length && shouldComeBefore(heap[r], heap[selected])) {
      selected = r;
    }

    if (selected !== i) {
      this.swap(heap, indexMap, i, selected);
      this.heapifyDown(heap, indexMap, selected, shouldComeBefore);
    }
  }

  private pushTop(post: Post) {
    this.topHeap.push(post);
    const i = this.topHeap.length - 1;
    this.topIndexMap.set(post.id, i);
    this.locationById.set(post.id, 'top');
    this.heapifyUp(this.topHeap, this.topIndexMap, i, this.isWorseTopCandidate);
  }

  private pushRest(post: Post) {
    this.restHeap.push(post);
    const i = this.restHeap.length - 1;
    this.restIndexMap.set(post.id, i);
    this.locationById.set(post.id, 'rest');
    this.heapifyUp(this.restHeap, this.restIndexMap, i, this.isBetterRestCandidate);
  }

  private removeAt(
    heap: Post[],
    indexMap: Map<number, number>,
    index: number,
    shouldComeBefore: (a: Post, b: Post) => boolean
  ) {
    const removed = heap[index];
    const last = heap.pop();

    indexMap.delete(removed.id);
    this.locationById.delete(removed.id);

    if (index < heap.length && last) {
      heap[index] = last;
      indexMap.set(last.id, index);
      this.heapifyDown(heap, indexMap, index, shouldComeBefore);
      this.heapifyUp(heap, indexMap, index, shouldComeBefore);
    }

    return removed;
  }

  private removeFromTop(id: number) {
    const index = this.topIndexMap.get(id);
    if (index === undefined) return null;
    return this.removeAt(this.topHeap, this.topIndexMap, index, this.isWorseTopCandidate);
  }

  private removeFromRest(id: number) {
    const index = this.restIndexMap.get(id);
    if (index === undefined) return null;
    return this.removeAt(this.restHeap, this.restIndexMap, index, this.isBetterRestCandidate);
  }

  private updateTop(post: Post) {
    const index = this.topIndexMap.get(post.id);
    if (index === undefined) return;

    this.topHeap[index] = post;
    this.heapifyDown(this.topHeap, this.topIndexMap, index, this.isWorseTopCandidate);
    const nextIndex = this.topIndexMap.get(post.id);
    if (nextIndex !== undefined) {
      this.heapifyUp(this.topHeap, this.topIndexMap, nextIndex, this.isWorseTopCandidate);
    }
  }

  private updateRest(post: Post) {
    const index = this.restIndexMap.get(post.id);
    if (index === undefined) return;

    this.restHeap[index] = post;
    this.heapifyDown(this.restHeap, this.restIndexMap, index, this.isBetterRestCandidate);
    const nextIndex = this.restIndexMap.get(post.id);
    if (nextIndex !== undefined) {
      this.heapifyUp(this.restHeap, this.restIndexMap, nextIndex, this.isBetterRestCandidate);
    }
  }

  private rebalance() {
    if (this.k <= 0) {
      while (this.topHeap.length > 0) {
        const post = this.removeFromTop(this.topHeap[0].id);
        if (post) this.pushRest(post);
      }
      return;
    }

    while (this.topHeap.length < this.k && this.restHeap.length > 0) {
      const post = this.removeFromRest(this.restHeap[0].id);
      if (post) this.pushTop(post);
    }

    while (this.topHeap.length > this.k) {
      const post = this.removeFromTop(this.topHeap[0].id);
      if (post) this.pushRest(post);
    }

    while (
      this.topHeap.length > 0 &&
      this.restHeap.length > 0 &&
      this.isBetterRestCandidate(this.restHeap[0], this.topHeap[0])
    ) {
      const topPost = this.removeFromTop(this.topHeap[0].id);
      const restPost = this.removeFromRest(this.restHeap[0].id);

      if (topPost) this.pushRest(topPost);
      if (restPost) this.pushTop(restPost);
    }
  }

  build(posts: Post[]) {
    this.topHeap = [];
    this.restHeap = [];
    this.topIndexMap.clear();
    this.restIndexMap.clear();
    this.locationById.clear();
    this.postsById.clear();

    posts.forEach((post) => this.insert(post));
  }

  insert(post: Post) {
    const normalizedPost = this.normalizePost(post);

    if (this.postsById.has(normalizedPost.id)) {
      this.update(normalizedPost);
      return;
    }

    this.postsById.set(normalizedPost.id, normalizedPost);

    if (this.topHeap.length < this.k) {
      this.pushTop(normalizedPost);
    } else if (
      this.topHeap.length > 0 &&
      this.isBetterRestCandidate(normalizedPost, this.topHeap[0])
    ) {
      const demoted = this.removeFromTop(this.topHeap[0].id);
      if (demoted) this.pushRest(demoted);
      this.pushTop(normalizedPost);
    } else {
      this.pushRest(normalizedPost);
    }

    this.rebalance();
  }

  update(post: Post) {
    const normalizedPost = this.normalizePost(post);

    if (!this.postsById.has(normalizedPost.id)) {
      this.insert(normalizedPost);
      return;
    }

    this.postsById.set(normalizedPost.id, normalizedPost);

    const location = this.locationById.get(normalizedPost.id);
    if (location === 'top') {
      this.updateTop(normalizedPost);
    } else if (location === 'rest') {
      this.updateRest(normalizedPost);
    } else {
      this.insert(normalizedPost);
      return;
    }

    this.rebalance();
  }

  remove(post: Post) {
    const id = post.id;
    const location = this.locationById.get(id);

    this.postsById.delete(id);

    if (location === 'top') {
      this.removeFromTop(id);
    } else if (location === 'rest') {
      this.removeFromRest(id);
    }

    this.rebalance();
  }

  getTopK(): Post[] {
    return [...this.topHeap].sort((a, b) => this.sortByLikesDesc(a, b));
  }

  size() {
    return this.topHeap.length;
  }

  candidateSize() {
    return this.restHeap.length;
  }
}
