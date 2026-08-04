import type { TruckAssetRow } from '@/types';

export type TruckViewScope = {
  canViewAll: boolean;
  canViewSelf: boolean;
};

export function isScopeConfigured(scope: TruckViewScope): boolean {
  return scope.canViewAll || scope.canViewSelf;
}

export function scopeTrucksToViewer(
  trucks: TruckAssetRow[],
  viewerId: string | null,
  scope: TruckViewScope,
): TruckAssetRow[] {
  if (!isScopeConfigured(scope) || scope.canViewAll) return trucks;
  if (!scope.canViewSelf) return [];
  if (!viewerId) return [];
  return trucks.filter((truck) => truck.extra?.driverId === viewerId);
}
