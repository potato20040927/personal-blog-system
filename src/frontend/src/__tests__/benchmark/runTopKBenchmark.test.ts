import { describe, expect, it } from 'vitest';
import type { Post } from '../../components/PostCard';
import { runTopKBenchmark } from '../../benchmark/runTopKBenchmark';

const posts: Post[] = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  title: `Post ${index + 1}`,
  content: 'content',
  category: 'test',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  likeCount: index,
}));

describe('runTopKBenchmark', () => {
  it('空資料集回傳安全的零值結果', () => {
    const result = runTopKBenchmark([]);

    expect(result).toEqual({
      legacyTime: 0,
      heapTime: 0,
      speedup: 0,
      heapSize: 0,
      candidateSize: 0,
    });
  });

  it('回傳 legacy sort 與 heap update 的 benchmark 指標', () => {
    const result = runTopKBenchmark(posts);

    expect(result.legacyTime).toBeGreaterThanOrEqual(0);
    expect(result.heapTime).toBeGreaterThanOrEqual(0);
    expect(result.speedup).toBeGreaterThanOrEqual(0);
    expect(result.heapSize).toBe(10);
    expect(result.candidateSize).toBe(10);
  });
});
