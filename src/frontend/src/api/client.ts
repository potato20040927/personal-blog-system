import { API_BASE_URL } from './config';

interface RequestOptions extends RequestInit {
  body?: any;
}

export const apiClient = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { body, headers, ...rest } = options;

  const token = localStorage.getItem('token');

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'API 發生錯誤');
  }

  return data;
};
