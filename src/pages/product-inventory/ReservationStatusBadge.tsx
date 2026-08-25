import type { ReactNode } from 'react';
import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import type { ReservationOrderStatus } from './useReservationOrderStatus';

export function ReservationStatusBadge({
  state,
  size = 'sm',
  fallback = null,
}: {
  readonly state: ReservationOrderStatus;
  readonly size?: 'xs' | 'sm';
  readonly fallback?: ReactNode;
}) {
  const { t } = useTranslation();
  if (state.status) {
    return (
      <Badge
        size={size}
        variant={state.cancelled ? 'filled' : 'light'}
        color={state.cancelled ? 'red' : state.status.color}
        tt="none"
      >
        {state.status.label || t('salesOrders.cancel.statusBadge')}
      </Badge>
    );
  }

  if (state.cancelled) {
    return (
      <Badge size={size} variant="filled" color="red" tt="none">
        {t('salesOrders.cancel.statusBadge')}
      </Badge>
    );
  }
  return <>{fallback}</>;
}
