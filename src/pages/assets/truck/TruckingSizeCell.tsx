import { Text } from '@mantine/core';
import { useTruckingSizeLabel } from '@/pages/transport-orders/useTruckingSize';

export function TruckingSizeCell({ value }: { readonly value: string | undefined }) {
  const labelOf = useTruckingSizeLabel();
  const label = value ? labelOf(value) : '';
  return label ? (
    <Text size="sm">{label}</Text>
  ) : (
    <Text size="sm" c="dimmed">
      —
    </Text>
  );
}
