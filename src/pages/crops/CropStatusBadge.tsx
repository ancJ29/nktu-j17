import { Badge } from '@mantine/core';
import type { MantineSize } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { CropStatus } from '@/types';

const STATUS_COLOR: Record<CropStatus, string> = {
  planned: 'gray',
  growing: 'green',
  harvested: 'blue',
};

type CropStatusBadgeProps = {
  readonly status: CropStatus;
  readonly size?: MantineSize;
};

export function CropStatusBadge({ status, size = 'sm' }: CropStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge color={STATUS_COLOR[status]} variant="light" size={size} radius="sm">
      {t(`crops.status.${status}`)}
    </Badge>
  );
}
