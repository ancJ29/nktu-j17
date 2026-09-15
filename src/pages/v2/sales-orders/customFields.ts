import { appConfig } from '@/config';
import type { CMngtAppConfig } from '@/config/schema';
import { createCustomFieldsReader } from '../customFieldsReader';

const reader = createCustomFieldsReader(
  (appConfig as unknown as CMngtAppConfig)?.features?.salesOrdersV2?.customFields,
);

export const salesOrderCustomFieldErrors = reader.errors;
export const useSalesOrderCustomFields = reader.useForViewer;
