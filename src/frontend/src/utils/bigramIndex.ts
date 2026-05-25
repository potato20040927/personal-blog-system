export type BigramIndex = Map<string, Set<number>>;

// 建 index
export function buildBigramIndex(posts: any[]): BigramIndex {
  const index: BigramIndex = new Map();

  for (const post of posts) {
    const text = (post.title + post.content).replace(/<[^>]+>/g, '');

    for (let i = 0; i < text.length - 1; i++) {
      const bigram = text[i] + text[i + 1];

      if (!index.has(bigram)) {
        index.set(bigram, new Set());
      }

      index.get(bigram)!.add(post.id);
    }
  }

  return index;
}

// 查 index
export function searchBigram(query: string, index: BigramIndex): Set<number> {
  const result = new Set<number>();

  if (query.length < 2) return result;

  for (let i = 0; i < query.length - 1; i++) {
    const bigram = query[i] + query[i + 1];
    const ids = index.get(bigram);

    if (!ids) continue;

    for (const id of ids) {
      result.add(id);
    }
  }

  return result;
}