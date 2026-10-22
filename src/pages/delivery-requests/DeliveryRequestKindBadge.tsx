import { Badge } from '@mantine/core';
import type { MantineSize } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { DeliveryRequest, DeliveryRequestExtra } from '@/types';

type DrKind = 'outbound' | 'additional' | 'vendor' | 'return' | 'sample';

function resolveDrKind(dr: Pick<DeliveryRequest, 'direction' | 'extra'>): DrKind {
  if (dr.direction !== 'inbound') {
    if (dr.extra.isAdditional) {
      return 'additional';
    }
    return 'outbound';
  }
  const inboundKind = (dr.extra as DeliveryRequestExtra | undefined)?.inboundKind ?? 'vendor';
  if (inboundKind === 'customer-return') return 'return';
  if (inboundKind === 'customer-sample') return 'sample';
  return 'vendor';
}

const KIND_META: Record<DrKind, { color: string; labelKey: string }> = {
  outbound: { color: 'blue', labelKey: 'deliveryRequests.form.directionOutbound' },
  additional: { color: 'yellow', labelKey: 'deliveryRequests.form.directionAdditional' },
  vendor: { color: 'teal', labelKey: 'deliveryRequests.form.directionInbound' },
  return: { color: 'orange', labelKey: 'deliveryRequests.kind.return' },
  sample: { color: 'grape', labelKey: 'deliveryRequests.kind.sample' },
};

export function DeliveryRequestKindBadge({
  dr,
  size = 'sm',
  variant = 'light',
  radius,
  style,
}: {
  dr: Pick<DeliveryRequest, 'direction' | 'extra'>;
  size?: MantineSize;
  variant?: string;
  radius?: MantineSize;
  style?: React.CSSProperties;
}) {
  const { t } = useTranslation();
  const meta = KIND_META[resolveDrKind(dr)];
  return (
    <Badge color={meta.color} variant={variant} size={size} radius={radius} style={style}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {t(meta.labelKey as any)}
    </Badge>
  );
}
