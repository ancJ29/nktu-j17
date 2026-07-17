

import type { SalesOrderExtra } from '@/types';
import type { ResolvedStatusOption } from '@/utils/permission';
import { SalesOrderStatusBadgeBase } from './SalesOrderStatusBadgeBase';
import { NKTU_SALES_ORDER_STATUS_BADGE_VARIANT } from './salesOrderStatusBadgeVariant';

type NKTUSalesOrderStatusBadgeProps = {
  readonly extra: SalesOrderExtra;
  readonly resolveDeliveryMethod: (value: string | undefined | null) => string;
  readonly resolveStatus: (value: string | undefined | null) => ResolvedStatusOption;
};

export function NKTUSalesOrderStatusBadge(props: NKTUSalesOrderStatusBadgeProps) {
  return <SalesOrderStatusBadgeBase {...props} variant={NKTU_SALES_ORDER_STATUS_BADGE_VARIANT} />;
}
