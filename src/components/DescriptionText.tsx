import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

type DescriptionTextProps = {
  readonly text?: string | null;

  readonly entityLabel: string;
};

export function DescriptionText({ text, entityLabel }: DescriptionTextProps) {
  const { t } = useTranslation();
  if (text) {
    return (
      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
        {text}
      </Text>
    );
  }
  return (
    <Text size="sm" c="dimmed" fs="italic">
      {t('__new__.01-common.empty.noDescription', { item: entityLabel })}
    </Text>
  );
}
