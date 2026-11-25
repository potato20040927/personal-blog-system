export const travelHeatLevels = [
  { min: 0, label: '0', color: '#f8e3e3' },
  { min: 1, label: '1', color: '#f39796' },
  { min: 2, label: '2–3', color: '#df514c' },
  { min: 4, label: '4–6', color: '#b6252f' },
  { min: 7, label: '7+', color: '#74121d' },
];

export const travelVisitLevels = [
  { min: 0, label: '未到訪', color: 'transparent' },
  { min: 1, label: '已到訪', color: '#b6252f' },
];

export function getTravelMapPath(districtId: string | null) {
  return districtId ? `/map?district=${encodeURIComponent(districtId)}` : '/map';
}

export type TravelMapMode = 'heat' | 'visited';
