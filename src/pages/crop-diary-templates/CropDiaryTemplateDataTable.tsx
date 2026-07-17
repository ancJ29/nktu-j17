import { useMemo } from 'react';
import { Badge, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { CropDiaryTemplate } from '@/types';
import { templateDayCount } from '@/utils/cropDiaryTemplateModel';
import { ListDataTable } from '@/components/ListDataTable';

type Props = {
  readonly templates: CropDiaryTemplate[];
  readonly isLoading?: boolean;
};

export function CropDiaryTemplateDataTable({ templates, isLoading }: Props) {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('common.labels.name'),
        width: '250px',
        render: (item: CropDiaryTemplate) => (
          <Stack gap={2}>
            <Text fz="md" fw={600} lh={1.25}>
              {item.name}
            </Text>
            <Text size="xs" c="dimmed" ff="monospace" tt="uppercase">
              {item.code}
            </Text>
          </Stack>
        ),
      },
      {
        key: 'description',
        header: t('common.labels.description'),
        render: (item: CropDiaryTemplate) =>
          item.extra?.description ? (
            <Text size="sm" c="dimmed" lineClamp={2}>
              {item.extra.description}
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              —
            </Text>
          ),
      },
      {
        key: 'days',
        header: t('cropDiaryTemplates.columns.days'),
        render: (item: CropDiaryTemplate) => (
          <Badge variant="light" color="primary" radius="sm" size="sm">
            {t('cropDiaryTemplates.dayCount', { count: templateDayCount(item) })}
          </Badge>
        ),
      },
    ],
    [t],
  );

  return (
    <ListDataTable
      data={templates}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('cropDiaryTemplates.noItems')}
      detailRoute={ROUTES.CROP_DIARY_TEMPLATES.DETAIL}
    />
  );
}
