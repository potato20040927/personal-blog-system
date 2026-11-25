import { API_BASE_URL } from './config';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export const apiClient = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { body, headers, ...rest } = options;
  const isFormData = body instanceof FormData;
  const token = localStorage.getItem('token');

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'API 發生錯誤');
  }

  return data;
};
