import { appConfig } from '@/config';
import type { LookupV2CategoryId } from '@/pages/lookup-v2/categoryRegistry';

export function getMaterialUnitCategory(): Extract<LookupV2CategoryId, 'unit' | 'material-unit'> {
  return appConfig.features?.materials?.unitCategory ?? 'material-unit';
}

export function isMaterialMultiUnit(): boolean {
  return appConfig.features?.materials?.multiUnit ?? false;
}

export function hasMaterialDescription(): boolean {
  return appConfig.features?.materials?.description ?? false;
}
export function hasMaterialSpecification(): boolean {
  return appConfig.features?.materials?.specification ?? false;
}
export function hasMaterialMemo(): boolean {
  return appConfig.features?.materials?.memo ?? false;
}
export function hasMaterialPricing(): boolean {
  return appConfig.features?.materials?.pricing ?? false;
}
export function hasMaterialTags(): boolean {
  return appConfig.features?.materials?.tags ?? false;
}
export function hasMaterialAttributes(): boolean {
  return appConfig.features?.materials?.attributes ?? false;
}
export function hasMaterialImages(): boolean {
  return appConfig.features?.materials?.images ?? false;
}
export function hasMaterialMinimumStock(): boolean {
  return appConfig.features?.materials?.minimumStock ?? false;
}

export function hasMaterialBulkImport(): boolean {
  return appConfig.features?.materials?.bulkImport ?? false;
}

export function isMaterialLowStock(
  minimumStock: number | undefined,
  onHand: number | undefined,
): boolean {
  return (
    typeof minimumStock === 'number' &&
    minimumStock > 0 &&
    typeof onHand === 'number' &&
    onHand > 0 &&
    onHand <= minimumStock
  );
}

export const MATERIAL_CATEGORY_LOOKUP: LookupV2CategoryId = 'material-category';
