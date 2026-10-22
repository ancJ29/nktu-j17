import { PRODUCT_V2_LIST_COLUMNS } from '@/pages/v2/products/listColumns';
import type { CredoAppConfig } from '../schema';
import { mergeFeature } from './featureMerge';

export type ProductsV2Form = {
  enabled: boolean;
  simpleMode: boolean;
  codePrefix: string;
  codePadLength: number;

  priceManagement: boolean;
  productPhoto: boolean;
  inventory: boolean;

  incomingColumn: boolean;
  incomingReceipts: boolean;
  outgoingOrders: boolean;
  listColumns: string[];
  hiddenColumns: string[];
};

const DEFAULTS: ProductsV2Form = {
  enabled: false,
  simpleMode: true,
  codePrefix: 'PRD-',
  codePadLength: 4,
  priceManagement: false,
  productPhoto: false,
  inventory: false,
  incomingColumn: false,
  incomingReceipts: false,
  outgoingOrders: false,
  listColumns: [],
  hiddenColumns: [],
};

export const readProductsV2 = (config: CredoAppConfig | null): ProductsV2Form => {
  const v2 = config?.features?.productsV2;
  return {
    enabled: v2?.enabled ?? DEFAULTS.enabled,
    simpleMode: v2?.simpleMode ?? DEFAULTS.simpleMode,
    codePrefix: v2?.codePrefix ?? DEFAULTS.codePrefix,
    codePadLength: v2?.codePadLength ?? DEFAULTS.codePadLength,
    priceManagement: v2?.priceManagement ?? DEFAULTS.priceManagement,
    productPhoto: v2?.productPhoto ?? DEFAULTS.productPhoto,
    inventory: v2?.inventory ?? DEFAULTS.inventory,
    incomingColumn: v2?.incomingColumn ?? DEFAULTS.incomingColumn,
    incomingReceipts: v2?.incomingReceipts ?? DEFAULTS.incomingReceipts,
    outgoingOrders: v2?.outgoingOrders ?? DEFAULTS.outgoingOrders,
    listColumns: [...(v2?.listColumns ?? DEFAULTS.listColumns)],
    hiddenColumns: [...(v2?.hiddenColumns ?? DEFAULTS.hiddenColumns)],
  };
};

export const productListColumnOptions = (
  form: ProductsV2Form,
): Array<{ value: string; label: string }> =>
  PRODUCT_V2_LIST_COLUMNS.filter(({ key }) => {
    if (key === 'price') return form.priceManagement;
    if (key === 'onHand' || key === 'minStock' || key === 'outgoing') return form.inventory;
    if (key === 'incoming') return form.inventory && form.incomingColumn;
    return true;
  }).map(({ key, label }) => ({ value: key, label }));

export const productCodePreview = ({ codePrefix, codePadLength }: ProductsV2Form): string =>
  `${codePrefix}${(1).toString().padStart(Math.max(0, codePadLength), '0')}`;

export const applyProductsV2 = (
  storedFeatures: CredoAppConfig['features'],
  form: ProductsV2Form,
): CredoAppConfig['features'] => mergeFeature(storedFeatures, 'productsV2', form);
