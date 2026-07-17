import {
  formatTransportOrderInvariantError,
  validateTransportOrderConfig,
} from '@/pages/transport-orders/validateConfig';
import type { CMngtTransportOrderFeatures } from '@credo/kits/types';
import { Alert, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

export function TransportOrderConfigInvariantAlert({
  features,
  knownDepartments,
}: {
  features: CMngtTransportOrderFeatures;
  knownDepartments?: ReadonlySet<string>;
}) {
  const result = validateTransportOrderConfig(features, knownDepartments);
  if (result.ok) return null;
  return (
    <Alert
      color="red"
      variant="light"
      icon={<IconAlertTriangle size={16} />}
      title="Configuration issues"
    >
      <Stack gap={2}>
        {result.errors.map((err, idx) => (
          <Text key={idx} size="xs">
            {formatTransportOrderInvariantError(err)}
          </Text>
        ))}
      </Stack>
    </Alert>
  );
}
