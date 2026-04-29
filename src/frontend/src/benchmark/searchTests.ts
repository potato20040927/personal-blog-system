import type { TestPost } from "./datasets";

export function linearSearch(posts: TestPost[], keyword: string) {
  return posts.filter(
    (p) =>
      p.title.toLowerCase().includes(keyword) ||
      p.content.toLowerCase().includes(keyword)
  );
}

// 之後倒排索引用
export function invertedSearch(
  index: Map<string, Set<number>>,
  posts: TestPost[],
  keyword: string
) {
  const ids = index.get(keyword) || new Set();

  return posts.filter((p) => ids.has(p.id));
}