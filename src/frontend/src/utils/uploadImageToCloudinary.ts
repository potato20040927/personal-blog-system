const CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dkoc0xopr';
const UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'article_images';

interface CloudinaryUploadResponse {
  secure_url?: string;
  error?: {
    message?: string;
  };
}

export async function uploadImageToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || CLOUD_NAME === 'your_cloud_name') {
    throw new Error('Missing VITE_CLOUDINARY_CLOUD_NAME');
  }

  if (!UPLOAD_PRESET || UPLOAD_PRESET === 'your_upload_preset') {
    throw new Error('Missing VITE_CLOUDINARY_UPLOAD_PRESET');
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  const data = (await res.json()) as CloudinaryUploadResponse;

  if (!res.ok) {
    throw new Error(data.error?.message || 'Image upload failed');
  }

  if (!data.secure_url) {
    throw new Error('Cloudinary did not return an image URL');
  }

  return data.secure_url;
}
