import { vi } from 'vitest';

export function createMockPostsContext(overrides = {}) {
  return {
    posts: [],
    setPosts: vi.fn(),

    category: null,
    setCategory: vi.fn(),

    search: '',
    setSearch: vi.fn(),

    sortBy: 'newest',
    setSortBy: vi.fn(),

    index: new Map<string, Set<number>>(),
    setIndex: vi.fn(),

    ...overrides,
  };
}