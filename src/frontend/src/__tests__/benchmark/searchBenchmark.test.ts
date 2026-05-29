import { describe, expect, it } from 'vitest';
import { buildBigramIndex } from '../../utils/bigramIndex';
import { bigramSearch, linearSearch } from '../../benchmark/searchBenchmark';

const posts = [
  {
    id: 1,
    title: 'React 測試文章',
    content: '<p>這是一篇前端測試內容</p>',
  },
  {
    id: 2,
    title: '旅遊日記',
    content: '<p>今天去了台北</p>',
  },
  {
    id: 3,
    title: '資料結構',
    content: '<p>Hash Map 查找很快</p>',
  },
];

describe('searchBenchmark', () => {
  it('linearSearch 會忽略 HTML tag 並支援大小寫不敏感搜尋', () => {
    const results = linearSearch(posts, 'react');

    expect(results.map((post) => post.id)).toEqual([1]);
  });

  it('bigramSearch 使用 bigram index 找出符合文章', () => {
    const index = buildBigramIndex(posts);
    const results = bigramSearch(posts, '台北', index);

    expect(results.map((post) => post.id)).toEqual([2]);
  });

  it('bigramSearch 對單字元查詢 fallback 到 linearSearch', () => {
    const index = buildBigramIndex(posts);
    const results = bigramSearch(posts, '測', index);

    expect(results.map((post) => post.id)).toEqual([1]);
  });
});
