import { Alert, List, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { deliveryRequestConfigErrors } from '@/config';
import { formatInvariantError } from '@/pages/delivery-requests/capabilities/validateConfig';

export function DeliveryRequestConfigErrorBanner() {
  const { t } = useTranslation();
  if (deliveryRequestConfigErrors.length === 0) return null;
  return (
    <Alert
      color="red"
      variant="light"
      icon={<IconAlertTriangle size={18} />}
      title={t('deliveryRequests.configErrors.title')}
      m="sm"
    >
      <Text size="sm" mb="xs">
        {t('deliveryRequests.configErrors.description')}
      </Text>
      <List size="sm" spacing={2}>
        {deliveryRequestConfigErrors.map((err, idx) => (
          <List.Item key={idx}>{formatInvariantError(err)}</List.Item>
        ))}
      </List>
    </Alert>
  );
}
