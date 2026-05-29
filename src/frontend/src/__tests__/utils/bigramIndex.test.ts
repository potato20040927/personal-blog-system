import { describe, expect, it } from 'vitest';
import { buildBigramIndex, searchBigram } from '../../utils/bigramIndex';

const posts = [
  {
    id: 1,
    title: '天氣晴朗',
    content: '<p>適合散步</p>',
  },
  {
    id: 2,
    title: '台北旅遊',
    content: '<p>夜市很好玩</p>',
  },
];

describe('bigramIndex', () => {
  it('buildBigramIndex 會從 title 與去除 HTML 後的 content 建立索引', () => {
    const index = buildBigramIndex(posts);

    expect(index.get('天氣')).toEqual(new Set([1]));
    expect(index.get('適合')).toEqual(new Set([1]));
    expect(index.get('<p')).toBeUndefined();
  });

  it('searchBigram 會回傳符合任一 bigram 的文章 id', () => {
    const index = buildBigramIndex(posts);

    expect(searchBigram('台北', index)).toEqual(new Set([2]));
    expect(searchBigram('不存在', index)).toEqual(new Set());
  });

  it('searchBigram 對單字元查詢回傳空集合', () => {
    const index = buildBigramIndex(posts);

    expect(searchBigram('天', index)).toEqual(new Set());
  });
});
