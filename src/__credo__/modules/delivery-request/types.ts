import type {
  CMngtDeliveryRequestDirection as DeliveryRequestDirection,
  CMngtDeliveryRequestItem as DeliveryRequestItem,
} from '@credo/connectors/types';
import type { DateTimeInput } from '@credo/kits/types';

export type {
  CMngtDeliveryRequest as DeliveryRequest,
  CMngtDeliveryRequestItem as DeliveryRequestItem,
  CMngtDeliveryRequestDirection as DeliveryRequestDirection,
} from '@credo/connectors/types';

export interface CreateDeliveryRequestInput<TExtra = Record<string, unknown>> {
  requestNumber: string;

  direction?: DeliveryRequestDirection;

  salesOrderId?: string;
  salesOrderNumber?: string;

  customerName?: string;

  vendorCode?: string;
  vendorName?: string;
  items: DeliveryRequestItem[];
  scheduledDate?: DateTimeInput | undefined;
  notes?: string;
  extra?: TExtra;
}

export interface UpdateDeliveryRequestInput<TExtra = Record<string, unknown>> {
  version?: string;
  customerName?: string;
  vendorCode?: string;
  vendorName?: string;
  items?: DeliveryRequestItem[];
  scheduledDate?: DateTimeInput | undefined;
  notes?: string;
  isClosed?: boolean;
  extra?: TExtra;
}

export interface DeliveryRequestFilter {
  isClosed?: boolean;
  search?: string;
  fromPeriod?: string;
  toPeriod?: string;
}
