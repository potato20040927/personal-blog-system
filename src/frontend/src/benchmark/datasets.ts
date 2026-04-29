export interface TestPost {
  id: number;
  title: string;
  content: string;
  category: string;
}

export function generatePosts(size: number): TestPost[] {
  return Array.from({ length: size }, (_, i) => ({
    id: i,
    title: `React Cloudinary Blog Post ${i}`,
    content: `This is a test article about search and data structure ${i}`,
    category: "test",
  }));
}