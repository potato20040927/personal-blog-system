import { searchBigram } from '../utils/bigramIndex';

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '');
}

export function linearSearch(posts: any[], query: string) {
  const q = query.toLowerCase();

  return posts.filter(p => {
    const text = (p.title + stripHtml(p.content)).toLowerCase();
    return text.includes(q);
  });
}

export function bigramSearch(
  posts: any[],
  query: string,
  index: any
) {
  const ids = searchBigram(query, index);

  return posts.filter(p => ids.has(p.id));
}