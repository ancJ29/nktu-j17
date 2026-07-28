import { Badge, Group, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { SalesOrderExtra } from '@/types';
import {
  isInternalDeliveryAllowed,
  isPricingManagementEnabled,
  perms,
  type ResolvedStatusOption,
  type ResolvedTagOption,
} from '@/utils/permission';
import { device } from '@credo/base-ui/utils';
import { getCancellationTargetStatusValue } from '@/pages/sales-orders/transitionEngine';
import type { SalesOrderStatusBadgeVariant } from './salesOrderStatusBadgeVariant';

const internalDeliveryAllowed = isInternalDeliveryAllowed();

const showPrice = isPricingManagementEnabled() && perms.salesOrder.canViewPrice();
const isMobile = device.isMobile;

type SalesOrderStatusBadgeBaseProps = {
  readonly extra: SalesOrderExtra;
  readonly resolveStatus: (value: string | undefined | null) => ResolvedStatusOption;
  readonly resolveDeliveryMethod: (value: string | undefined | null) => string;
  readonly variant: SalesOrderStatusBadgeVariant;

  readonly tagOptions?: ResolvedTagOption[];
  readonly size?: 'xs' | 'sm' | 'md';
};

export function SalesOrderStatusBadgeBase({
  extra,
  resolveStatus,
  resolveDeliveryMethod,
  variant,
  tagOptions = [],
  size = 'sm',
}: SalesOrderStatusBadgeBaseProps) {
  const { t } = useTranslation();

  const isExternalDelivery = variant.freightIsExternal
    ? extra.deliveryMethod === 'freight' || extra.isInternalDelivery === false
    : extra.isInternalDelivery === false;

  const isCancelled = extra.cancellation != null;
  const cancelTargetValue = isCancelled ? getCancellationTargetStatusValue() : undefined;
  const status =
    isCancelled && cancelTargetValue
      ? resolveStatus(cancelTargetValue)
      : isCancelled
        ? null
        : resolveStatus(extra.status);
  const label = status ? status.label || (isCancelled ? cancelTargetValue : extra.status) : null;
  const statusSize = variant.statusBadgeSize ?? size;

  const badges = (
    <>
      {status && label ? (
        <Badge color={status.color} variant="filled" size={statusSize}>
          {label}
        </Badge>
      ) : variant.showCancelledFallback && isCancelled ? (
        <Badge color="red" variant="filled" size={statusSize}>
          {t('salesOrders.cancel.statusBadge')}
        </Badge>
      ) : null}
      {extra.isUrgent && (
        <Badge color="red" variant="filled" size={size}>
          {t('salesOrders.urgent')}
        </Badge>
      )}
      {variant.showDeliveryKindBadge && internalDeliveryAllowed && (
        <Badge color={isExternalDelivery ? 'orange' : 'green'} variant="filled" size={size}>
          {isExternalDelivery
            ? t('__new__.07-entities.salesOrders.list.filterExternalDelivery')
            : t('__new__.07-entities.salesOrders.list.filterInternalDelivery')}
        </Badge>
      )}
      {variant.deliveryMethodBadge === 'outline' && extra.deliveryMethod && (
        <Badge variant="outline" size={size}>
          {resolveDeliveryMethod(extra.deliveryMethod)}
        </Badge>
      )}
      {variant.deliveryMethodBadge === 'externalOnly' &&
        isExternalDelivery &&
        extra.deliveryMethod && (
          <Badge color="orange" variant="filled" size={size}>
            {resolveDeliveryMethod(extra.deliveryMethod)}
          </Badge>
        )}
      {/* Billing indicators — pricing-gated, shown only when set so most rows
          stay uncluttered. Mobile only: the desktop table has dedicated
          billing columns, so badges here would duplicate them. */}
      {variant.showBillingBadges && isMobile && showPrice && extra.isPaid && (
        <Badge color="teal" variant="light" size={size}>
          {t('salesOrders.billing.paid')}
        </Badge>
      )}
      {variant.showBillingBadges &&
        isMobile &&
        showPrice &&
        !extra.isPaid &&
        typeof extra.paidAmount === 'number' &&
        extra.paidAmount > 0 && (
          <Badge color="orange" variant="light" size={size}>
            {t('salesOrders.billing.partialPaidShort', {
              amount: extra.paidAmount.toLocaleString(),
            })}
          </Badge>
        )}
      {variant.showBillingBadges && isMobile && showPrice && extra.invoiceIssued && (
        <Badge color="blue" variant="light" size={size}>
          {t('salesOrders.billing.invoicedBadge')}
        </Badge>
      )}
      {variant.showTags &&
        extra.tags?.map((tag, idx) => {
          const opt = tagOptions.find((o) => o.value === tag);
          if (!opt) return null;
          return (
            <Badge key={`${tag}-${idx}`} color={opt.color} variant="filled" size={size}>
              {opt.label}
            </Badge>
          );
        })}
    </>
  );

  if (isMobile) {
    return (
      <Group gap={4} wrap="wrap">
        {badges}
      </Group>
    );
  }
  return <Stack gap={4}>{badges}</Stack>;
}
