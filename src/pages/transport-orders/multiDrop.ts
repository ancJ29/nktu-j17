import type { TransportOrderDropStop, TransportOrderMultiDrop, TransportOrderRoute } from '@/types';

export const MULTI_DROP_MAX_STOPS = 7;
export const MULTI_DROP_DAY_OPTIONS = [1, 2, 3] as const;
export const MULTI_DROP_DEFAULT_DAYS = 1;

export type LocationProvince = {
  province: string;
  wards: { ward: string; distanceKm: number }[];
};

export function parseLocations(json: unknown): LocationProvince[] {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return [];
  const provinces: LocationProvince[] = [];
  for (const [province, wardsRaw] of Object.entries(json)) {
    if (!wardsRaw || typeof wardsRaw !== 'object' || Array.isArray(wardsRaw)) continue;
    const wards = Object.entries(wardsRaw as Record<string, unknown>)
      .filter((entry): entry is [string, number] => Number.isFinite(entry[1]))
      .map(([ward, distanceKm]) => ({ ward, distanceKm }));
    if (wards.length > 0) provinces.push({ province, wards });
  }
  return provinces;
}

export function stopKey(stop: Pick<TransportOrderDropStop, 'province' | 'ward'>): string {
  return JSON.stringify([stop.province, stop.ward]);
}

export function stopLabel(stop: Pick<TransportOrderDropStop, 'province' | 'ward'>): string {
  return `${stop.ward}, ${stop.province}`;
}

export function provinceOptions(provinces: readonly LocationProvince[]): string[] {
  return provinces.map((p) => p.province);
}

export function wardOptions(provinces: readonly LocationProvince[], province: string): string[] {
  return provinces.find((p) => p.province === province)?.wards.map((w) => w.ward) ?? [];
}

export function findStop(
  provinces: readonly LocationProvince[],
  key: string,
): TransportOrderDropStop | undefined {
  for (const { province, wards } of provinces) {
    for (const { ward, distanceKm } of wards) {
      if (stopKey({ province, ward }) === key) return { province, ward, distanceKm };
    }
  }
  return undefined;
}

export function multiDropPickup(
  md: Pick<TransportOrderMultiDrop, 'pickupLocation' | 'from'>,
): string {
  return md.pickupLocation || md.from || '';
}

export function routeFromMultiDrop(
  md: TransportOrderMultiDrop,

  pickupLabel?: string,
): TransportOrderRoute {
  const labels = md.stops.map(stopLabel);
  const last = labels[labels.length - 1] ?? '';
  return {
    pickup: pickupLabel || multiDropPickup(md),
    stuffing: labels.slice(0, -1).join('; '),
    dropoff: last,
  };
}

export function isMultiDropType(
  truckType: string | undefined | null,
  configured: readonly string[],
): boolean {
  return !!truckType && configured.includes(truckType);
}
