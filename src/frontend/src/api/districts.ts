import { apiClient } from './client';
import type { District } from '../types/district';

export function getDistricts(signal: AbortSignal) {
  return apiClient<District[]>('/posts/districts', { signal });
}
