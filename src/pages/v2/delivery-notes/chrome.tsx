import type { DeliveryNoteV2Status } from '@/types/delivery-note-v2';
import { createModuleChrome } from '../moduleChrome';
import { deliveryNoteCustomFieldErrors } from './customFields';
import { deliveryNoteFlowErrors, deliveryNoteStatusDisplay } from './statusFlow';

const chrome = createModuleChrome<DeliveryNoteV2Status>({
  statusDisplay: deliveryNoteStatusDisplay,
  configBlocks: (t) => [
    {
      errors: deliveryNoteFlowErrors,
      title: t('deliveryNotesV2.flowInvalid.title'),
      message: t('deliveryNotesV2.flowInvalid.message'),
    },
    {
      errors: deliveryNoteCustomFieldErrors,
      title: t('deliveryNotesV2.fieldsInvalid.title'),
      message: t('deliveryNotesV2.fieldsInvalid.message'),
    },
  ],
});

export const DeliveryNoteV2StatusBadge = chrome.StatusBadge;
export const DeliveryNoteConfigAlerts = chrome.ConfigAlerts;
