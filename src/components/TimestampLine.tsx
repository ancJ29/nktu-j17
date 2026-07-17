import { Text } from '@mantine/core';
import { formatDateTime, type DateInput } from '@/utils/dateFormat';
import { useTranslation } from 'react-i18next';

type TimestampLineProps = {
  updatedAt: DateInput;
  createdAt: DateInput;
};

export function TimestampLine({ updatedAt, createdAt }: TimestampLineProps) {
  const { t } = useTranslation();
  return (
    <Text size="xs" c="dimmed" ta="right" style={{ whiteSpace: 'nowrap' }}>
      <Text span fw={600}>
        {t('common.labels.updatedAt')}
      </Text>{' '}
      {formatDateTime(updatedAt)}
      <Text span mx={8} c="dimmed" opacity={0.6}>
        ·
      </Text>
      <Text span fw={600}>
        {t('common.labels.createdAt')}
      </Text>{' '}
      {formatDateTime(createdAt)}
    </Text>
  );
}
