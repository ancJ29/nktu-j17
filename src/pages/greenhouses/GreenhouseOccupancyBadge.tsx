import { Badge } from '@mantine/core';
import type { MantineSize } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { GreenhouseOccupancy } from '@/utils/greenhouseOccupancy';
import { occupancyTone } from './occupancyPresentation';

type GreenhouseOccupancyBadgeProps = {
  readonly occupancy: GreenhouseOccupancy;
  readonly size?: MantineSize;
};

export function GreenhouseOccupancyBadge({
  occupancy,
  size = 'sm',
}: GreenhouseOccupancyBadgeProps) {
  const { t } = useTranslation();
  const key = occupancy.isOverdue ? 'overdue' : occupancy.state;
  return (
    <Badge color={occupancyTone(occupancy)} variant="light" size={size} radius="sm">
      {t(`greenhouses.occupancy.${key}`)}
    </Badge>
  );
}
