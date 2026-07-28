export type SalesOrderStatusBadgeVariant = {
  freightIsExternal: boolean;

  showCancelledFallback: boolean;

  showDeliveryKindBadge: boolean;

  deliveryMethodBadge: 'outline' | 'externalOnly' | 'none';

  showBillingBadges: boolean;

  showTags: boolean;

  statusBadgeSize?: 'xs' | 'sm' | 'md';
};

export const DEFAULT_SALES_ORDER_STATUS_BADGE_VARIANT: SalesOrderStatusBadgeVariant = {
  freightIsExternal: false,
  showCancelledFallback: true,
  showDeliveryKindBadge: true,
  deliveryMethodBadge: 'outline',
  showBillingBadges: true,
  showTags: true,
};

export const NKTU_SALES_ORDER_STATUS_BADGE_VARIANT: SalesOrderStatusBadgeVariant = {
  freightIsExternal: true,
  showCancelledFallback: false,
  showDeliveryKindBadge: false,
  deliveryMethodBadge: 'externalOnly',
  showBillingBadges: false,
  showTags: false,
  statusBadgeSize: 'md',
};
