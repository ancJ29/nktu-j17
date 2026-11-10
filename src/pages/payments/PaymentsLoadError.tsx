import { Alert, Button, Group, Text } from '@mantine/core';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function PaymentsLoadError({
  days,
  onRetry,
}: {
  readonly days: number;
  readonly onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Alert color="red" icon={<IconAlertTriangle size={18} />} role="alert">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Text size="sm">{t('payments.loadError', { days })}</Text>
        <Button
          size="xs"
          variant="light"
          color="red"
          leftSection={<IconRefresh size={14} />}
          onClick={onRetry}
        >
          {t('payments.retry')}
        </Button>
      </Group>
    </Alert>
  );
}
