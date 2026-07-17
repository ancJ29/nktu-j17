import type { DateTimeInput, NullableDateTimeInput } from '@credo/kits/types';
import type { CMngtDeliveryRequest as BaseDeliveryRequest } from '@credo/connectors/types';

export type DeliveryRequestActivityEntry = {
  timestamp: DateTimeInput;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  userId?: string;
  userName?: string;
  note?: string;
};

export type DeliveryRequestPhoto = {
  url: string;
  timestamp: DateTimeInput;
  userId?: string;
  userName?: string;
  fileName?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  isDeleted?: boolean;
  
  takenAtDelivery?: boolean;
};

export type DeliveryRequestAttachment = {
  url: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  timestamp: DateTimeInput;
  userId?: string;
  userName?: string;
  isDeleted?: boolean;
};

export type DeliveryRequestDeliveredItem = {
  productCode: string;
  quantity: number;
  unit: string;
};

export type DeliveryRequestInboundKind = 'vendor' | 'customer-return' | 'customer-sample';

export type DeliveryRequestExtra = {
  status?: string;
  
  inboundKind?: DeliveryRequestInboundKind;
  
  returnRestock?: boolean;
  
  returnRestockedAt?: string;
  
  isDeleted?: boolean;
  
  isUrgent?: boolean;
  
  isAdditional?: boolean;
  
  activityLog?: DeliveryRequestActivityEntry[];
  
  assignedDriverId?: string;
  assignedDriverName?: string;
  
  pickupTimestamp?: NullableDateTimeInput;
  
  deliveryTimestamp?: NullableDateTimeInput;
  
  photos?: DeliveryRequestPhoto[];
  attachments?: DeliveryRequestAttachment[];
  
  deliveredItems?: DeliveryRequestDeliveredItem[];

  
  deliveryAddress?: string;
  
  googleMapUrl?: string;
  
  displayOrderNumber?: string;
  [key: string]: unknown;
};

export type DeliveryRequest = BaseDeliveryRequest<DeliveryRequestExtra>;
