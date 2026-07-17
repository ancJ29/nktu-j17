

import type { SalesOrderExtra } from '@/types';
import type { ResolvedStatusOption, ResolvedTagOption } from '@/utils/permission';
import { SalesOrderStatusBadgeBase } from './SalesOrderStatusBadgeBase';
import { DEFAULT_SALES_ORDER_STATUS_BADGE_VARIANT } from './salesOrderStatusBadgeVariant';

type SalesOrderStatusBadgeProps = {
  readonly extra: SalesOrderExtra;
  readonly resolveStatus: (value: string | undefined | null) => ResolvedStatusOption;
  readonly resolveDeliveryMethod: (value: string | undefined | null) => string;
  readonly tagOptions: ResolvedTagOption[];
  readonly size?: 'xs' | 'sm' | 'md';
};

export function SalesOrderStatusBadge(props: SalesOrderStatusBadgeProps) {
  return (
    <SalesOrderStatusBadgeBase {...props} variant={DEFAULT_SALES_ORDER_STATUS_BADGE_VARIANT} />
  );
}
