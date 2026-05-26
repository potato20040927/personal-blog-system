import { buildBigramIndex } from '../utils/bigramIndex';
import { linearSearch, bigramSearch} from './searchBenchmark';
import { PostIndexManager } from '../utils/PostIndexManager';

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

export function runBenchmark(posts: any[], query: string) {
  const index = buildBigramIndex(posts);

  // Linear
  const linear = measure(() => {
    return linearSearch(posts, query);
  });

  // Bigram
  const bigram = measure(() => {
    return bigramSearch(posts, query, index);
  });

  const safeBigramTime = Math.max(bigram.time, 0.001);

  return {
    linearTime: linear.time,
    bigramTime: bigram.time,

    linearResults: linear.result,
    bigramResults: bigram.result,

    speedup: linear.time / safeBigramTime,

    totalPosts: posts.length,
    totalBigrams: index.size,
  };
}


export function runSortBenchmark(posts: any[]) {
  const legacySort = () => {
    return [...posts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const indexManager = new PostIndexManager<any>(
    (p) => new Date(p.createdAt).getTime(),
    (p) => new Date(p.updatedAt).getTime()
  );
  indexManager.rebuild(posts);

  const avlSort = () => {
    return indexManager.getCreatedDesc();
  };

  const legacy = measure(legacySort, 50);
  const avl = measure(avlSort, 50);

  return {
    legacySortTime: legacy.time,
    avlSortTime: avl.time,
    sortSpeedup: legacy.time / (Math.max(avl.time, 0.001)),
  };
}