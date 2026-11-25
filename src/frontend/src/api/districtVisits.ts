import { apiClient } from './client';

export interface DistrictVisitPhoto {
  id: string;
  url: string;
}

export interface DistrictVisit {
  districtId: string;
  description: string;
  photos: DistrictVisitPhoto[];
}

export function getDistrictVisits(signal: AbortSignal) {
  return apiClient<DistrictVisit[]>('/district-visits', { signal });
}

export function saveDistrictVisitDescription(districtId: string, description: string) {
  return apiClient<{ description: string }>(`/district-visits/${encodeURIComponent(districtId)}`, {
    method: 'PUT',
    body: { description },
  });
}

export function addDistrictVisitPhoto(districtId: string, file: File) {
  const body = new FormData();
  body.append('file', file);
  return apiClient<DistrictVisitPhoto>(`/district-visits/${encodeURIComponent(districtId)}/photos`, {
    method: 'POST',
    body,
  });
}
