import { formatNumber } from '@/utils/number';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks/useLookupV2Options';
import { MATERIAL_UNIT_CATEGORY } from './materials/materialV2Form';
import { PRODUCT_UNIT_CATEGORY } from './products/productV2Form';

export function useLineUnitLabel(): (line: {
  readonly itemType?: string | undefined;
  readonly unit?: string | undefined;
}) => string {
  const productUnits = useLookupV2Labels(PRODUCT_UNIT_CATEGORY);
  const materialUnits = useLookupV2Labels(MATERIAL_UNIT_CATEGORY);
  return (line) =>
    line.unit
      ? lookupLabelOf(line.itemType === 'material' ? materialUnits : productUnits, line.unit)
      : '';
}

export function useLineQuantityText(): (line: {
  readonly itemType?: string | undefined;
  readonly unit?: string | undefined;
  readonly quantity: number;
}) => string {
  const unitLabelOf = useLineUnitLabel();
  return (line) => {
    const unit = unitLabelOf(line);
    return unit ? `${formatNumber(line.quantity)} ${unit}` : formatNumber(line.quantity);
  };
}
