import {
  formatInvariantError,
  validateDeliveryRequestConfig,
} from '@/pages/delivery-requests/capabilities/validateConfig';
import type { CMngtDeliveryRequestFeatures } from '@credo/kits/types';
import { Alert, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

export function DeliveryRequestConfigInvariantAlert({
  features,
}: {
  features: CMngtDeliveryRequestFeatures;
}) {
  const result = validateDeliveryRequestConfig(features);
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
            {formatInvariantError(err)}
          </Text>
        ))}
      </Stack>
    </Alert>
  );
}
