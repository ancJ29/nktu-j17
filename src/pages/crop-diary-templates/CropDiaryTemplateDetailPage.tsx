import {
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
  IconCopy,
  IconDownload,
  IconEdit,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import { ProcessPlanView } from './plan/ProcessPlanView';
import { StatPill } from '@/components/StatPill';
import { NotFoundState } from '@/components/NotFoundState';
import {
  useCropDiaryTemplateStore,
  CROP_DIARY_TEMPLATE_RECORD_TARGET,
} from '@/stores/useCropDiaryTemplateStore';
import { formatDateTime } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import { exportCropSheet } from '@/utils/cropSheetExcel';
import { perms } from '@/utils/permission';
import type { CropDiaryTemplate, CropDiaryTemplateCopyFrom, CropProcessPlan } from '@/types';

const isMobile = device.isMobile;
const canEdit = perms.cropDiaryTemplate.canEdit();

const canCreate = perms.cropDiaryTemplate.canCreate();

export function CropDiaryTemplateDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [template, setTemplate] = useState<CropDiaryTemplate | null>(null);
  const [loading, setLoading] = useState(true);

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
  const plan: CropProcessPlan = template.extra?.plan ?? {
    columns: [],
    stages: [],
    totalDays: 0,
    days: [],
  };
  const totalDays = plan.totalDays;

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

  const handleCopy = () => {
    const copyFrom: CropDiaryTemplateCopyFrom = {
      name: template.name,
      ...(template.extra?.description && { description: template.extra.description }),
      plan,
      sourceId: template.id,
      sourceCode: template.code,
    };
    navigate(ROUTES.CROP_DIARY_TEMPLATES.NEW, { state: { copyFrom } });
  };

  const handleExport = () => {
    exportCropSheet(
      plan,
      {
        stage: t('cropDiaryTemplates.plan.stage'),
        day: t('cropDiaryTemplates.plan.day'),
        date: 'Ngày thực tế',
        weekday: 'Thứ',
        totals: 'TỔNG PHÂN',
        sheetName: t('cropDiaryTemplates.excel.sheetName'),
      },
      `crop_process_${template.code}.xlsx`,
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
          <Group gap="xs">
            {canCreate && (
              <Button
                onClick={handleCopy}
                variant="default"
                size="compact-sm"
                leftSection={<IconCopy size={14} />}
              >
                {t('__new__.01-common.actions.copy')}
              </Button>
            )}
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

      {/* No mobile Edit affordance: the form page redirects mobile visitors to
          the list, so the tap bounced and cost the operator the record they were
          reading. Editing a template is desktop-only — detail-page pattern § F. */}
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

      {/* The process itself. Rendered from `extra.plan` — the day matrix that
          replaced the one-activity-per-day model on 2026-08-10; a template
          predating it simply shows no columns. */}
      <SectionCard
        icon={<IconCalendar size={14} />}
        title={t('cropDiaryTemplates.plan.gridSection')}
        actions={
          <Button
            size="compact-sm"
            variant="subtle"
            leftSection={<IconDownload size={14} />}
            onClick={handleExport}
          >
            {t('__new__.01-common.actions.exportExcel')}
          </Button>
        }
      >
        <ProcessPlanView plan={plan} />
      </SectionCard>
    </Stack>
  );
}
