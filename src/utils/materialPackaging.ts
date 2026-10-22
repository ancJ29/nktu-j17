import type { Material } from '@/types';
import type { PackagingAwareItem } from './inventoryMath';

export function materialHasMultipleUnits(material: Material | null | undefined): boolean {
  return (material?.extra?.units?.length ?? 0) > 1;
}

export function materialToPackagingItem(material: Material): PackagingAwareItem {
  return {
    unit: material.extra?.units?.[0] ?? '',
    extra: {
      units: material.extra?.units,
      unitConversions: material.extra?.unitConversions,
    },
  };
}
