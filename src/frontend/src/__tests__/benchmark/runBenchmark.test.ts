import { describe, it, expect } from 'vitest';
import { runBenchmark } from '../../benchmark/runBenchmark';

const mockPosts = [
  {
    id: 1,
    title: '今天的天氣很好',
    content: '<p>天氣晴朗</p>',
  },
  {
    id: 2,
    title: '西班牙旅遊',
    content: '<p>馬德里很好玩</p>',
  },
  {
    id: 3,
    title: '人工智慧',
    content: '<p>AI發展快速</p>',
  },
];

describe('runBenchmark', () => {

  it('should return benchmark metrics', () => {
    const result = runBenchmark(mockPosts, '天氣');

    expect(result).toHaveProperty('linearTime');
    expect(result).toHaveProperty('bigramTime');
    expect(result).toHaveProperty('speedup');
    expect(result).toHaveProperty('totalPosts', 3);
    expect(result).toHaveProperty('totalBigrams');
  });

  it('should return correct search results (linear vs bigram)', () => {
    const result = runBenchmark(mockPosts, '天氣');

    expect(result.linearResults.length).toBe(1);
    expect(result.bigramResults.length).toBe(1);

    expect(result.linearResults[0].id).toBe(1);
    expect(result.bigramResults[0].id).toBe(1);
  });

  it('should fallback to linear search when query is 1 char', () => {
    const result = runBenchmark(mockPosts, '天');

    expect(result.linearResults.length).toBeGreaterThan(0);
    expect(result.bigramResults.length).toBeGreaterThan(0);
  });

  it('should handle empty results', () => {
    const result = runBenchmark(mockPosts, '不存在的字');

    expect(result.linearResults.length).toBe(0);
    expect(result.bigramResults.length).toBe(0);
  });
});