

import {
  getDeliveryRequestStatusOptions,
  resolveStatusOptions,
  createStatusResolver,
} from '@/utils/permission';

const statusOptions = resolveStatusOptions(getDeliveryRequestStatusOptions());

export const deliveryRequestStatusOptions = {
  statusOptions,
  resolveStatus: createStatusResolver(statusOptions),
};
