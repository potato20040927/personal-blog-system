import { buildBigramIndex } from '../utils/bigramIndex';
import {
  linearSearch,
  bigramSearch
} from './searchBenchmark';

function measure(fn: () => void, repeat = 10) {
  let total = 0;

  for (let i = 0; i < repeat; i++) {
    const t1 = performance.now();
    fn();
    const t2 = performance.now();
    total += t2 - t1;
  }

  return total / repeat;
}

export function runBenchmark(posts: any[], query: string) {
  const index = buildBigramIndex(posts);

  const linearTime = measure(() => {
    linearSearch(posts, query);
  });

  const bigramTime = measure(() => {
    bigramSearch(posts, query, index);
  });

  const safeBigramTime = Math.max(bigramTime, 0.001);

  return {
    linearTime,
    bigramTime,
    speedup: linearTime / safeBigramTime,
    totalPosts: posts.length,
    totalBigrams: index.size,
  };
}