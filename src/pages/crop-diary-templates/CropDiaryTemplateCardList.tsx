import { Badge, Card, Group, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconClipboardList } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { ListCardList } from '@/components/ListCardList';
import { templateDayCount } from '@/utils/cropDiaryTemplateModel';
import type { CropDiaryTemplate } from '@/types';

type Props = {
  readonly templates: CropDiaryTemplate[];
  readonly isLoading?: boolean;
};

function CardSkeleton() {
  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap={6}>
        <Skeleton h={14} w="60%" />
        <Skeleton h={10} w="40%" />
      </Stack>
    </Card>
  );
}

export function CropDiaryTemplateCardList({ templates, isLoading }: Props) {
  const { t } = useTranslation();

  return (
    <ListCardList
      data={templates}
      isLoading={isLoading}
      detailRoute={ROUTES.CROP_DIARY_TEMPLATES.DETAIL}
      renderSkeleton={() => <CardSkeleton />}
      emptyState={
        <Card withBorder padding="xl" radius="md">
          <Stack align="center" gap="sm" py="md">
            <ThemeIcon size={56} radius="xl" variant="light" color="gray">
              <IconClipboardList size={28} stroke={1.5} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              {t('cropDiaryTemplates.emptyTitle')}
            </Text>
            <Text size="xs" c="dimmed" ta="center" maw={260}>
              {t('cropDiaryTemplates.emptyMessage')}
            </Text>
          </Stack>
        </Card>
      }
      renderCard={(item) => (
        <Stack gap={4}>
          <Group gap={8} wrap="nowrap" justify="space-between" align="flex-start">
            <Text fw={700} size="sm" lh={1.25} truncate style={{ flex: 1 }}>
              {item.name}
            </Text>
            <Badge variant="light" color="primary" radius="sm" size="sm">
              {t('cropDiaryTemplates.dayCount', { count: templateDayCount(item) })}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed" ff="monospace" tt="uppercase" fw={500}>
            {item.code}
          </Text>
          {item.extra?.description && (
            <Text size="xs" c="dimmed" lineClamp={2}>
              {item.extra.description}
            </Text>
          )}
        </Stack>
      )}
    />
  );
}
