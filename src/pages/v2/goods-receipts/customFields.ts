import { appConfig } from '@/config';
import type { CMngtAppConfig } from '@/config/schema';
import { createCustomFieldsReader } from '../customFieldsReader';

const reader = createCustomFieldsReader(
  (appConfig as unknown as CMngtAppConfig)?.features?.goodsReceiptsV2?.customFields,
);

export const goodsReceiptCustomFieldErrors = reader.errors;
export const useGoodsReceiptCustomFields = reader.useForViewer;
