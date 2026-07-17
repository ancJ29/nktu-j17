import {
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconCalendar,
  IconClipboardList,
  IconDownload,
  IconEdit,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import { StatPill } from '@/components/StatPill';
import { NotFoundState } from '@/components/NotFoundState';
import {
  useCropDiaryTemplateStore,
  CROP_DIARY_TEMPLATE_RECORD_TARGET,
} from '@/stores/useCropDiaryTemplateStore';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { formatDateTime } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import { daysToRows, templatePlanDays } from '@/utils/cropDiaryTemplateModel';
import { exportCropDiaryTemplateRows } from '@/utils/cropDiaryTemplateExcel';
import { perms } from '@/utils/permission';
import type { CropDiaryTemplate } from '@/types';

const isMobile = device.isMobile;
const canEdit = perms.cropDiaryTemplate.canEdit();

export function CropDiaryTemplateDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [template, setTemplate] = useState<CropDiaryTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  
  const materials = useMaterialStore((s) => s.items);
  const materialsInitialized = useMaterialStore((s) => s.initialized);
  const loadMaterials = useMaterialStore((s) => s.loadAll);
  useEffect(() => {
    if (!materialsInitialized) loadMaterials();
  }, [materialsInitialized, loadMaterials]);
  const materialName = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of materials) map.set(m.code, m.name);
    return (code: string) => map.get(code) ?? code;
  }, [materials]);

  useEffect(() => {
    if (!id) return;
    const cached = useCropDiaryTemplateStore.getState().getById(id) as
      CropDiaryTemplate | undefined;
    if (cached) {
      
      setTemplate(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    asyncDeduplicator.call(`crop-diary-template:${id}`, async () => {
      await cMngtConnector
        .getSingleRecordById(CROP_DIARY_TEMPLATE_RECORD_TARGET, { id })
        .then((res) => setTemplate(res.item as CropDiaryTemplate))
        .catch(() => {
          notifications.show({
            color: 'red',
            message: t('cropDiaryTemplates.notifications.fetchError'),
          });
          setTemplate(null);
        })
        .finally(() => setLoading(false));
    });
  }, [id, t]);

  if (loading) return null;
  if (!template) {
    return (
      <NotFoundState
        title={t('common.notFound.title')}
        message={t('common.notFound.message')}
        backTo={ROUTES.CROP_DIARY_TEMPLATES.LIST}
        backLabel={t('common.notFound.backToList')}
      />
    );
  }

  const description = template.extra?.description;
  const days = templatePlanDays(template);
  const totalDays = template.extra?.totalDates ?? days.length;

  const statbook = (
    <Group gap="xs" wrap={isMobile ? 'wrap' : 'nowrap'} style={{ flexShrink: 0 }}>
      <StatPill
        icon={<IconCalendar size={isMobile ? 12 : 14} />}
        label={t('cropDiaryTemplates.detail.statDays')}
        value={formatNumber(totalDays)}
        compact={isMobile}
      />
    </Group>
  );

  const handleExport = () => {
    const rows = daysToRows(days, materialName);
    exportCropDiaryTemplateRows(
      rows,
      {
        day: t('cropDiaryTemplates.excel.colDay'),
        activity: t('cropDiaryTemplates.excel.colActivity'),
        material: t('cropDiaryTemplates.excel.colMaterial'),
        quantity: t('cropDiaryTemplates.excel.colQuantity'),
        unit: t('cropDiaryTemplates.excel.colUnit'),
        memo: t('__new__.01-common.labels.note'),
        sheetName: t('cropDiaryTemplates.excel.sheetName'),
      },
      `crop_diary_template_${template.code}.xlsx`,
    );
  };

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      {!isMobile && (
        <Group justify="space-between">
          <Button
            onClick={() => window.history.back()}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('__new__.01-common.actions.back')}
          </Button>
          {canEdit && (
            <Button
              component={Link}
              to={ROUTES.CROP_DIARY_TEMPLATES.EDIT.replace(':id', template.id)}
              variant="light"
              size="compact-sm"
              leftSection={<IconEdit size={14} />}
            >
              {t('__new__.01-common.actions.edit')}
            </Button>
          )}
        </Group>
      )}

      <Card
        withBorder
        radius="md"
        padding={isMobile ? 'md' : 'lg'}
        style={{
          background:
            'linear-gradient(180deg, var(--mantine-color-body), var(--mantine-color-default-hover))',
        }}
      >
        <Group
          gap={isMobile ? 'sm' : 'lg'}
          wrap="nowrap"
          align="flex-start"
          justify="space-between"
        >
          <Group
            gap={isMobile ? 'sm' : 'lg'}
            wrap="nowrap"
            align="flex-start"
            style={{ minWidth: 0 }}
          >
            <ThemeIcon size={isMobile ? 56 : 80} radius={12} variant="light" color="primary">
              <IconClipboardList size={isMobile ? 28 : 40} stroke={1.5} />
            </ThemeIcon>
            <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
              <Title order={isMobile ? 5 : 3} lh={1.2}>
                {template.name}
              </Title>
              <Text size="xs" ff="monospace" c="dimmed" tt="uppercase" fw={500}>
                {template.code}
              </Text>
            </Stack>
          </Group>
          {!isMobile && statbook}
        </Group>
        {isMobile && <Box mt="md">{statbook}</Box>}
      </Card>

      {isMobile && canEdit && (
        <Button
          component={Link}
          to={ROUTES.CROP_DIARY_TEMPLATES.EDIT.replace(':id', template.id)}
          variant="light"
          size="sm"
          leftSection={<IconEdit size={16} />}
          fullWidth
        >
          {t('__new__.01-common.actions.edit')}
        </Button>
      )}

      <SectionCard
        icon={<IconInfoCircle size={14} />}
        title={t('cropDiaryTemplates.detail.infoTitle')}
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <DetailField label={t('common.labels.name')}>{template.name}</DetailField>
          <DetailField label={t('common.labels.code')}>
            <Text span ff="monospace" fw={500} tt="uppercase">
              {template.code}
            </Text>
          </DetailField>
        </SimpleGrid>
        {description && (
          <DetailField label={t('cropDiaryTemplates.form.descriptionLabel')}>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {description}
            </Text>
          </DetailField>
        )}
        {!isMobile && (
          <>
            <Divider />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DetailField label={t('common.labels.createdAt')}>
                {formatDateTime(template.createdAt)}
              </DetailField>
              <DetailField label={t('common.labels.updatedAt')}>
                {formatDateTime(template.updatedAt)}
              </DetailField>
            </SimpleGrid>
          </>
        )}
      </SectionCard>

      <SectionCard
        icon={<IconCalendar size={14} />}
        title={t('cropDiaryTemplates.daysTitle')}
        actions={
          <Button
            variant="default"
            size="compact-sm"
            leftSection={<IconDownload size={14} />}
            onClick={handleExport}
          >
            {t('__new__.01-common.actions.exportExcel')}
          </Button>
        }
      >
        <Stack gap="xs">
          {days.map((day) => (
            <Card key={day.day} withBorder radius="md" padding="sm">
              <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                <Group gap={8} wrap="nowrap">
                  <Badge variant="light" color="gray" radius="sm" size="sm">
                    {t('cropDiaryTemplates.dayLabel', { day: day.day })}
                  </Badge>
                  <Text size="sm" fw={600} truncate>
                    {day.activity || '—'}
                  </Text>
                </Group>
                {day.memo && (
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                    {day.memo}
                  </Text>
                )}
                {day.materials.length > 0 && (
                  <Group gap={6} wrap="wrap" mt={2}>
                    {day.materials.map((m, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        color="primary"
                        radius="sm"
                        size="sm"
                        tt="none"
                      >
                        {materialName(m.materialCode)}
                        {typeof m.quantity === 'number'
                          ? ` · ${formatNumber(m.quantity)}${m.unit ? ` ${m.unit}` : ''}`
                          : ''}
                      </Badge>
                    ))}
                  </Group>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
