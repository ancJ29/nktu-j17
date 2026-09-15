import { featureFlags } from '@/utils/features';
import { perms } from '@/utils/permission';
import type { ProductV2Attribute, ProductV2Row } from '@/types';

export const PRODUCT_UNIT_CATEGORY = 'product-unit';
export const PRODUCT_CATEGORY_CATEGORY = 'product-category';

export const canSeePrice = featureFlags.productsV2.priceManagement && perms.product.canViewPrice();
export const canEditPrice = canSeePrice && perms.product.canManagePrice();

export const showPhotos =
  !featureFlags.productsV2.simpleMode && featureFlags.productsV2.productPhoto;

export const showInventory = featureFlags.productsV2.inventory;

export const showIncomingColumn = showInventory && featureFlags.productsV2.incomingColumn;
export const showIncomingReceipts = showInventory && featureFlags.productsV2.incomingReceipts;
export const showOutgoingOrders = showInventory && featureFlags.productsV2.outgoingOrders;

export const canManageInventory = perms.product.canManageInventory();

export type ProductV2FormValues = {
  code: string;
  name: string;
  category: string;
  unit: string;

  price: number | '';

  minStock: number | '';

  ignoreStockAlert: boolean;

  attributes: ProductV2Attribute[];
  isActive: boolean;
};

export const EMPTY_PRODUCT_V2: ProductV2FormValues = {
  code: '',
  name: '',
  category: '',
  unit: '',
  price: '',
  minStock: '',
  ignoreStockAlert: false,
  attributes: [],
  isActive: true,
};

export const valuesOf = (row: ProductV2Row): ProductV2FormValues => ({
  code: row.code,
  name: row.name,
  category: row.extra?.category ?? '',
  unit: row.unit ?? '',
  price: row.price ?? '',
  minStock: row.extra?.minimumInventory?.value ?? '',
  ignoreStockAlert: row.extra?.ignoreStockAlert === true,
  attributes: (row.extra?.attributes ?? []).map((a) => ({ key: a.key, value: a.value })),
  isActive: row.isActive,
});

export const cleanAttributes = (rows: readonly ProductV2Attribute[]): ProductV2Attribute[] =>
  rows
    .map((row) => ({ key: row.key.trim(), value: row.value.trim() }))
    .filter((row) => row.key.length > 0);

export const patchOf = (
  values: ProductV2FormValues,
  editing: ProductV2Row | null,
): Record<string, unknown> => {
  const code = values.code.trim().toUpperCase();
  const category = values.category.trim();
  const unit = values.unit.trim();
  const attributes = cleanAttributes(values.attributes);
  return {
    ...(code ? { code } : {}),
    name: values.name.trim(),
    unit,
    isActive: values.isActive,
    ...(canEditPrice ? { price: values.price === '' ? undefined : values.price } : {}),
    extra: {
      ...(editing?.extra ?? {}),
      category: category || undefined,

      ...(showInventory
        ? {
            minimumInventory:
              values.minStock === ''
                ? undefined
                : { value: values.minStock, ...(unit ? { unit } : {}) },

            ignoreStockAlert: values.ignoreStockAlert ? true : undefined,
          }
        : {}),

      attributes: attributes.length > 0 ? attributes : undefined,
    },
  };
};
