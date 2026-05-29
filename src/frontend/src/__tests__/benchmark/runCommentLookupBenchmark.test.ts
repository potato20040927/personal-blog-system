import { describe, expect, it } from 'vitest';
import { runCommentLookupBenchmark } from '../../benchmark/runCommentLookupBenchmark';

describe('runCommentLookupBenchmark', () => {
  it('回傳 lookup 與 update 的 benchmark 指標', () => {
    const result = runCommentLookupBenchmark(3);

    expect(result.commentCount).toBe(500);
    expect(result.lookupCount).toBe(10000);
    expect(result.updateCount).toBe(5000);
    expect(result.foundCount).toBe(10000);
    expect(result.linearTime).toBeGreaterThanOrEqual(0);
    expect(result.hashMapTime).toBeGreaterThanOrEqual(0);
    expect(result.arrayUpdateTime).toBeGreaterThanOrEqual(0);
    expect(result.mapUpdateTime).toBeGreaterThanOrEqual(0);
    expect(result.speedup).toBeGreaterThanOrEqual(0);
    expect(result.updateSpeedup).toBeGreaterThanOrEqual(0);
  });
});
