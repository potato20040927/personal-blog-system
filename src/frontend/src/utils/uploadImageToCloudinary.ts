import { API_BASE_URL } from '../api/config';

interface ImageUploadResponse {
  url: string;
}

export async function uploadImageToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('token');

  const res = await fetch(`${API_BASE_URL}/uploads/image`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = (await res.json()) as Partial<ImageUploadResponse> & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error || 'Image upload failed');
  }

  if (!data.url) {
    throw new Error('Server did not return an image URL');
  }

  return data.url;
}
