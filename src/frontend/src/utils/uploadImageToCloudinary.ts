import { apiClient } from '../api/client';

interface ImageUploadResponse {
  url: string;
}

export async function uploadImageToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const data = await apiClient<Partial<ImageUploadResponse>>('/uploads/image', {
    method: 'POST',
    body: formData,
  });

  if (!data.url) {
    throw new Error('Server did not return an image URL');
  }

  return data.url;
}
