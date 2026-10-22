import { byClient } from '@/config/client';

export type DeliveryRequestVariant = {
  quickCreateMode: 'modal' | 'route';

  mobileQuickCreate: boolean;

  editMode: 'modal' | 'route';

  showListItems: boolean;

  showPricing: boolean;

  seedScheduledDateFromSalesOrder: boolean;

  inboundStartsPending: boolean;

  skipViewScopeGuard: boolean;

  showScheduledDateInBar: boolean;

  clientSpecific?: {
    NKTU?: {
      salesDeptScopedView?: boolean;

      salesDepartmentCode?: string;
    };
  };
};

export const DEFAULT_DELIVERY_REQUEST_VARIANT: DeliveryRequestVariant = {
  quickCreateMode: 'route',
  mobileQuickCreate: false,
  editMode: 'route',
  showListItems: true,
  showPricing: true,
  seedScheduledDateFromSalesOrder: true,
  inboundStartsPending: false,
  skipViewScopeGuard: false,
  showScheduledDateInBar: false,
};

export const NKTU_DELIVERY_REQUEST_VARIANT: DeliveryRequestVariant = {
  quickCreateMode: 'modal',
  mobileQuickCreate: true,
  editMode: 'modal',
  showListItems: false,
  showPricing: false,
  seedScheduledDateFromSalesOrder: false,
  inboundStartsPending: true,
  skipViewScopeGuard: true,
  showScheduledDateInBar: true,
  clientSpecific: {
    NKTU: {
      salesDeptScopedView: true,
      salesDepartmentCode: 'sales',
    },
  },
};

export const RESOLVED_DELIVERY_REQUEST_VARIANT: DeliveryRequestVariant = byClient(
  { nktu: NKTU_DELIVERY_REQUEST_VARIANT },
  DEFAULT_DELIVERY_REQUEST_VARIANT,
);
