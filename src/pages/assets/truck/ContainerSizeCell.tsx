import { Text } from '@mantine/core';
import { useContainerSizeLabel } from '@/pages/transport-orders/containerSize';

export function ContainerSizeCell({ value }: { readonly value: string | undefined }) {
  const labelOf = useContainerSizeLabel();
  const label = value ? labelOf(value) : '';
  return label ? (
    <Text size="sm">{label}</Text>
  ) : (
    <Text size="sm" c="dimmed">
      —
    </Text>
  );
}
