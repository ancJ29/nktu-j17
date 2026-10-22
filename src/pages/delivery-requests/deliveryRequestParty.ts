

import type { DeliveryRequest, DeliveryRequestExtra } from '@/types';

export function deliveryRequestPartyIsCustomer(
  dr: Pick<DeliveryRequest, 'direction' | 'extra'>,
): boolean {
  if (dr.direction !== 'inbound') return true;
  const inboundKind = (dr.extra as DeliveryRequestExtra | undefined)?.inboundKind ?? 'vendor';
  return inboundKind !== 'vendor';
}

export function deliveryRequestPartyKey(
  dr: Pick<DeliveryRequest, 'direction' | 'extra' | 'customerName' | 'vendorName'>,
): string {
  return (deliveryRequestPartyIsCustomer(dr) ? dr.customerName : dr.vendorName)?.trim() ?? '';
}
