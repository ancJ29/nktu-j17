import type { OperationLog } from '@/types';

export const REFUEL_LOG_TYPE = 'refuel';

export function refuelConsumption(log: OperationLog): number | null {
  const litres = Number(log.extra?.litres);
  const distance = Number(log.extra?.distanceKm);
  if (!Number.isFinite(litres) || litres <= 0) return null;
  if (!Number.isFinite(distance) || distance <= 0) return null;
  return (litres / distance) * 100;
}

export function formatConsumption(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export type RefuelTotals = {
  litres: number;
  cost: number;
  distance: number;

  avgConsumption: number | null;
};

export function computeRefuelTotals(logs: OperationLog[]): RefuelTotals {
  let litres = 0;
  let cost = 0;
  let distance = 0;
  let litresWithDistance = 0;
  let distanceWithLitres = 0;
  for (const log of logs) {
    const e = log.extra ?? {};
    const li = Number(e.litres);
    const amt = Number(e.totalAmount);
    const dist = Number(e.distanceKm);
    if (Number.isFinite(li)) litres += li;
    if (Number.isFinite(amt)) cost += amt;
    if (Number.isFinite(dist) && dist > 0) {
      distance += dist;
      if (Number.isFinite(li) && li > 0) {
        litresWithDistance += li;
        distanceWithLitres += dist;
      }
    }
  }
  const avgConsumption =
    distanceWithLitres > 0 ? (litresWithDistance / distanceWithLitres) * 100 : null;
  return { litres, cost, distance, avgConsumption };
}
