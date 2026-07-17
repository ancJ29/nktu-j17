import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { VendorOriginLabels } from './vendorOriginLabels';

export function VendorOriginBadge({
  isDomestic,
  labels,
}: {
  readonly isDomestic: boolean;
  readonly labels: VendorOriginLabels;
}) {
  const { t } = useTranslation();
  return (
    <Badge variant="light" color={isDomestic ? 'blue' : 'red'} radius="sm" size="sm">
      {t(isDomestic ? labels.domestic : labels.overseas)}
    </Badge>
  );
}
