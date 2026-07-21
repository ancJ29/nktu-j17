/**
 * Shared, non-component form bits for the delivery-request create/edit surfaces
 * (`DeliveryRequestFormPage` + `CreateDeliveryRequestModal`). Kept out of the
 * page module so it can export only components (Fast Refresh) and so the page
 * and the modal share one source for the form value shape.
 */

import type { CMngtDeliveryRequestDirection } from '@credo/connectors/types';
import type { DateTimeInput } from '@credo/kits/types';
import type { Customer, Vendor } from '@/types';

export type ItemFormValues = {
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  /** Optional location passthrough from the source SO line. */
  fromLocationCode?: string;
};

export type DeliveryRequestFormValues = {
  requestNumber: string;
  /** 'outbound' = deliver to customer; 'inbound' = receive from vendor. */
  direction: CMngtDeliveryRequestDirection;
  /** Outbound (deliver) — link to the originating sales order. Optional. */
  salesOrderId: string;
  salesOrderNumber: string;
  /** Outbound (deliver) — customer name. Auto-filled from SO when picked. */
  customerName: string;
  /** Inbound (receive) — vendor we're collecting from. */
  vendorCode: string;
  vendorName: string;
  /**
   * Delivery address + optional Google Maps link. Both live under
   * `extra` in the persisted record (the top-level `deliveryAddress`
   * column was retired); the form keeps them flat for `getInputProps`
   * convenience and the submit handler nests them back into `extra`.
   */
  deliveryAddress: string;
  googleMapUrl: string;
  /**
   * Mantine 8's `DateInput` writes ISO date strings (`'YYYY-MM-DD'`) into
   * Mantine form state, but the form is initialized from a fetched record's
   * timestamp (a `Date` object). The submit handler accepts both shapes via
   * `toDateTimeInputOrUndefined`.
   */
  scheduledDate: Date | string | null;
  notes: string;
  items: ItemFormValues[];
  /** Assigned driver — usually an employee. Optional on create. */
  assignedDriverId: string;
  /** High-priority flag — red highlight on the list. */
  isUrgent: boolean;
};

/** Coerce the heterogeneous `scheduledDate` form value into an ISO string for the BFF. */
export function toDateTimeInputOrUndefined(
  v: Date | string | null | undefined,
): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') {
    // DateInput's `'YYYY-MM-DD'` parses cleanly via the Date constructor.
    const parsed = new Date(v);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }
  return v.toISOString();
}

/**
 * Initial DR scheduled date when creating from a sales order. Uses the SO's
 * planned delivery date when it falls today or later; otherwise (empty, or
 * before today) defaults to **today**. The DR picker is `futureOnly`, so a
 * stale / missing SO plan date must not seed a past day the operator can't
 * keep. Day-level comparison anchored to local midnight (matches the list's
 * past/today delivery-date coloring).
 */
export function resolveInitialScheduledDateFromSalesOrder(
  soDeliveryDate: DateTimeInput | null | undefined,
): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!soDeliveryDate) return today;
  const planned = new Date(soDeliveryDate);
  if (Number.isNaN(planned.getTime())) return today;
  const plannedDay = new Date(planned);
  plannedDay.setHours(0, 0, 0, 0);
  return plannedDay < today ? today : planned;
}

export const emptyItem: ItemFormValues = {
  productCode: '',
  productName: '',
  quantity: 1,
  unit: '',
  unitPrice: 0,
};

/**
 * Resolve a vendor's default inbound (pickup) address + Google Maps URL for an
 * inbound DR. The first declared pickup address wins; otherwise the billing
 * `vendor.address` (+ its `extra.addressGoogleMapUrl`). Returns empty strings
 * for a one-off / unresolved vendor (no registered record to read).
 *
 * Shared so the DR form (which fills the visible address fields on vendor
 * select) and the NKTU quick-create modal (which has no address field and
 * resolves this at save time) stay in lockstep.
 */
export function resolveVendorInboundAddress(vendor: Vendor | undefined | null): {
  deliveryAddress: string;
  googleMapUrl: string;
} {
  const firstPickup = vendor?.extra?.pickupAddresses?.[0];
  if (firstPickup) {
    return { deliveryAddress: firstPickup.address, googleMapUrl: firstPickup.googleMapUrl ?? '' };
  }
  if (vendor?.address) {
    return {
      deliveryAddress: vendor.address,
      googleMapUrl: vendor.extra?.addressGoogleMapUrl ?? '',
    };
  }
  return { deliveryAddress: '', googleMapUrl: '' };
}

/**
 * Resolve a customer's pickup address + Google Maps URL for an inbound
 * **customer-sample** DR (the driver still has to drive somewhere to collect
 * the sample — the sample path used to persist a blank address, leaving the
 * detail page showing `-` and no map link). Same ladder the SO form uses when
 * it seeds a delivery address: the first declared shipping address wins,
 * otherwise the billing `customer.address` (+ its `extra.addressGoogleMapUrl`).
 * Returns empty strings for an unresolved customer.
 */
export function resolveCustomerPickupAddress(customer: Customer | undefined | null): {
  deliveryAddress: string;
  googleMapUrl: string;
} {
  const firstShipping = customer?.extra?.shippingAddresses?.[0];
  if (firstShipping) {
    return {
      deliveryAddress: firstShipping.address,
      googleMapUrl: firstShipping.googleMapUrl ?? '',
    };
  }
  if (customer?.address) {
    return {
      deliveryAddress: customer.address,
      googleMapUrl: customer.extra?.addressGoogleMapUrl ?? '',
    };
  }
  return { deliveryAddress: '', googleMapUrl: '' };
}
