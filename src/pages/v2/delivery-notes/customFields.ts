import { appConfig } from '@/config';
import type { CMngtAppConfig } from '@/config/schema';
import { createCustomFieldsReader } from '../customFieldsReader';

const reader = createCustomFieldsReader(
  (appConfig as unknown as CMngtAppConfig)?.features?.deliveryNotesV2?.customFields,
);

export const deliveryNoteCustomFieldErrors = reader.errors;
export const useDeliveryNoteCustomFields = reader.useForViewer;
