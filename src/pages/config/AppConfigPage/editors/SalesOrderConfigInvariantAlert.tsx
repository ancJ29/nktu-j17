import {
  formatInvariantError,
  validateSalesOrderConfig,
} from '@/pages/sales-orders/capabilities/validateConfig';
import type { CMngtSalesOrderFeatures } from '@credo/kits/types';
import { Alert, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

export function SalesOrderConfigInvariantAlert({
  features,
  knownDepartments,
}: {
  features: CMngtSalesOrderFeatures;
  
  knownDepartments?: ReadonlySet<string>;
}) {
  const result = validateSalesOrderConfig(features, knownDepartments);
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
