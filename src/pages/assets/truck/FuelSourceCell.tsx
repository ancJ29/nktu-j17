import { Text } from '@mantine/core';
import { IconGasStation } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ColorBadge } from '@credo/base-ui/components';
import type { RefuelLogExtra } from '@/types';

export function FuelSourceCell({ extra }: { readonly extra: RefuelLogExtra | undefined }) {
  const { t } = useTranslation();
  if (extra?.fuelSource !== 'tank') {
    return (
      <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
        <IconGasStation size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
        {t('operationLogs.refuel.source.external')}
      </Text>
    );
  }
  return (
    <ColorBadge
      size="xs"
      label={extra.oilTankCode || t('operationLogs.refuel.source.tank')}
      color="teal"
    />
  );
}
