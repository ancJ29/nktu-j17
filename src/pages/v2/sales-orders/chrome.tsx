import type { SalesOrderV2Status } from '@/types/sales-order-v2';
import { createModuleChrome } from '../moduleChrome';
import { salesOrderCustomFieldErrors } from './customFields';
import { salesOrderFlowErrors, salesOrderStatusDisplay } from './statusFlow';

const chrome = createModuleChrome<SalesOrderV2Status>({
  statusDisplay: salesOrderStatusDisplay,
  configBlocks: (t) => [
    {
      errors: salesOrderFlowErrors,
      title: t('salesOrdersV2.flowInvalid.title'),
      message: t('salesOrdersV2.flowInvalid.message'),
    },
    {
      errors: salesOrderCustomFieldErrors,
      title: t('salesOrdersV2.fieldsInvalid.title'),
      message: t('salesOrdersV2.fieldsInvalid.message'),
    },
  ],
});

export const SalesOrderV2StatusBadge = chrome.StatusBadge;
export const SalesOrderConfigAlerts = chrome.ConfigAlerts;
