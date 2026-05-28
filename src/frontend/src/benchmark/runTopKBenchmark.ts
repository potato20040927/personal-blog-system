import type { Post } from '../components/PostCard';
import { TopKHeapManager } from '../utils/TopKHeapManager';

function clonePosts(posts: Post[]): Post[] {
  return posts.map(p => ({
    ...p,
  }));
}

function measure<T>(fn: () => T, repeat = 1) {
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

export function runTopKBenchmark(posts: Post[]) {
  if (posts.length === 0) {
    return {
      legacyTime: 0,
      heapTime: 0,
      speedup: 0,
      heapSize: 0,
      candidateSize: 0,
    };
  }

  // =========================
  // Legacy full re-sort
  // =========================

  const legacyDataset = clonePosts(posts);

  const legacy = measure(() => {
    for (let i = 0; i < 1000; i++) {
      const randomIndex = Math.floor(
        Math.random() * legacyDataset.length
      );

      legacyDataset[randomIndex].likeCount += 1;

      [...legacyDataset]
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, 10);
    }
  });

  // =========================
  // Streaming heap
  // =========================

  const heapDataset = clonePosts(posts);

  const heapManager = new TopKHeapManager(10);

  heapManager.build(heapDataset);

  const heap = measure(() => {
    for (let i = 0; i < 1000; i++) {
      const randomIndex = Math.floor(
        Math.random() * heapDataset.length
      );

      heapDataset[randomIndex].likeCount += 1;

      heapManager.update(heapDataset[randomIndex]);

      heapManager.getTopK();
    }
  });

  return {
    legacyTime: legacy.time,
    heapTime: heap.time,

    speedup:
      legacy.time /
      Math.max(heap.time, 0.001),

    heapSize: heapManager.size(),
    candidateSize: heapManager.candidateSize(),
  };
}
