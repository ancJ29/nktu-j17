import type { GoodsReceiptV2Status } from '@/types/goods-receipt-v2';
import { createModuleChrome } from '../moduleChrome';
import { goodsReceiptCustomFieldErrors } from './customFields';
import { goodsReceiptFlowErrors, goodsReceiptStatusDisplay } from './statusFlow';

const chrome = createModuleChrome<GoodsReceiptV2Status>({
  statusDisplay: goodsReceiptStatusDisplay,
  configBlocks: (t) => [
    {
      errors: goodsReceiptFlowErrors,
      title: t('goodsReceiptsV2.flowInvalid.title'),
      message: t('goodsReceiptsV2.flowInvalid.message'),
    },
    {
      errors: goodsReceiptCustomFieldErrors,
      title: t('goodsReceiptsV2.fieldsInvalid.title'),
      message: t('goodsReceiptsV2.fieldsInvalid.message'),
    },
  ],
});

export const GoodsReceiptV2StatusBadge = chrome.StatusBadge;
export const GoodsReceiptConfigAlerts = chrome.ConfigAlerts;
