import { Alert, List, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { salesOrderConfigErrors } from '@/config';
import { formatInvariantError } from '@/pages/sales-orders/capabilities/validateConfig';

export function SalesOrderConfigErrorBanner() {
  const { t } = useTranslation();
  if (salesOrderConfigErrors.length === 0) return null;
  return (
    <Alert
      color="red"
      variant="light"
      icon={<IconAlertTriangle size={18} />}
      title={t('salesOrders.configErrors.title')}
      m="sm"
    >
      <Text size="sm" mb="xs">
        {t('salesOrders.configErrors.description')}
      </Text>
      <List size="sm" spacing={2}>
        {salesOrderConfigErrors.map((err, idx) => (
          <List.Item key={idx}>{formatInvariantError(err)}</List.Item>
        ))}
      </List>
    </Alert>
  );
}
