import {
  Button,
  Card,
  Divider,
  Group,
  Loader,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCalendar,
  IconChevronRight,
  IconHash,
  IconPlant2,
  IconPlus,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { device, logger } from '@credo/base-ui/utils';
import { DateField } from '@/components/DateField';
import { EmployeeSelector } from '@/components/selectors';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { queryHarvestedCrops, useCropStore } from '@/stores/useCropStores';
import { useCropDiaryTemplateStore } from '@/stores/useCropDiaryTemplateStore';
import { templateDayCount } from '@/utils/cropDiaryTemplateModel';
import { autoApplyDiaryTemplateOnCreate } from '@/utils/cropDiaryTemplateApply';
import {
  findGrowingCropInGreenhouse,
  findOverlappingCrop,
  windowEndDate,
} from '@/utils/cropSchedule';
import { buildDailySequentialCode } from '@/utils/code';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { perms } from '@/utils/permission';
import { CROP_CODE_PREFIX, type Crop, type CropExtra, type Greenhouse } from '@/types';
import { CropStatusBadge } from './CropStatusBadge';

const isMobile = device.isMobile;
const canView = perms.crop.canView();
const canCreate = perms.crop.canCreate();

type CropTab = 'active' | 'harvested';

type CreatableStatus = 'planned' | 'growing';

type CropFormValues = {
  code: string;
  name: string;
  status: CreatableStatus;
  fromDate: string | null;
  totalDates: number | string;
  plantType: string;
  numberOfSeeds: number | string;
  growingMedium: string;
  picId: string | null;
  diaryTemplateCode: string | null;
  notes: string;
};

function blankCropForm(code: string): CropFormValues {
  return {
    code,
    name: '',
    status: 'planned',
    fromDate: todayInVnDateString(),
    totalDates: '',
    plantType: '',
    numberOfSeeds: '',
    growingMedium: '',
    picId: null,
    diaryTemplateCode: null,
    notes: '',
  };
}

function toPeriod(dateStr: string | null): string | null {
  return dateStr ? dateStr.slice(0, 7) : null;
}

function defaultMonthRange(): [string, string] {
  const now = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return [fmt(from), fmt(now)];
}

type Props = {
  readonly greenhouse: Greenhouse;
};

export function GreenhouseCropsSection({ greenhouse }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [tab, setTab] = useState<CropTab>('active');

  const allCrops = useCropStore((s) => s.items);
  const cropsInitialized = useCropStore((s) => s.initialized);
  const cropsLoading = useCropStore((s) => s.loading);
  const loadCrops = useCropStore((s) => s.loadAll);

  const activeCrops = useMemo(
    () => allCrops.filter((c) => c.greenhouseCode === greenhouse.code),
    [allCrops, greenhouse.code],
  );

  useEffect(() => {
    if (!canView) return;
    if (!cropsInitialized) loadCrops();
  }, [cropsInitialized, loadCrops]);

  const [monthRange, setMonthRange] = useState<[string | null, string | null]>(defaultMonthRange);
  const [harvested, setHarvested] = useState<Crop[]>([]);
  const [harvestedLoading, setHarvestedLoading] = useState(false);
  const [harvestedLoaded, setHarvestedLoaded] = useState(false);
  const [from, to] = monthRange;

  useEffect(() => {
    const fromPeriod = toPeriod(from);
    const toPeriodStr = toPeriod(to);
    if (!canView || tab !== 'harvested' || !fromPeriod || !toPeriodStr) return;
    let cancelled = false;
    const run = async () => {
      setHarvestedLoading(true);
      try {
        const crops = await queryHarvestedCrops(
          { fromPeriod, toPeriod: toPeriodStr },
          { greenhouseCode: greenhouse.code },
        );
        if (cancelled) return;
        setHarvested(crops);
        setHarvestedLoaded(true);
      } catch (err) {
        if (cancelled) return;
        logger.error('Harvested crop query failed:', err);
        notifications.show({
          color: 'red',
          title: t('crops.notifications.fetchError'),
          message: '',
        });
      } finally {
        if (!cancelled) setHarvestedLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [tab, from, to, greenhouse.code, t]);

  const codePreview = useMemo(
    () =>
      buildDailySequentialCode(
        CROP_CODE_PREFIX,
        allCrops.map((c) => c.code),
      ),
    [allCrops],
  );

  const templates = useCropDiaryTemplateStore((s) => s.items);
  const templatesInit = useCropDiaryTemplateStore((s) => s.initialized);
  const loadTemplates = useCropDiaryTemplateStore((s) => s.loadAll);
  useEffect(() => {
    if (!templatesInit) loadTemplates();
  }, [templatesInit, loadTemplates]);
  const templateOptions = useMemo(
    () => templates.map((tpl) => ({ value: tpl.code, label: `${tpl.name} (${tpl.code})` })),
    [templates],
  );

  const [formOpened, formHandlers] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<CropFormValues>({
    initialValues: blankCropForm(codePreview),
    validate: {
      name: (v) => (v.trim() ? null : t('common.validation.nameRequired')),
      numberOfSeeds: (v) =>
        v !== '' && Number(v) > 0 ? null : t('crops.validation.numberOfSeedsRequired'),
      fromDate: (v) => (v ? null : t('crops.validation.fromRequired')),
      totalDates: (v, values) => {
        const n = Number(v);
        if (v === '' || !Number.isFinite(n) || n < 1) {
          return t('crops.validation.totalDatesRequired');
        }
        if (values.fromDate) {
          const end = windowEndDate(values.fromDate, n);
          if (end) {
            const overlap = findOverlappingCrop(
              useCropStore.getState().items as Crop[],
              greenhouse.code,
              values.fromDate,
              end,
            );
            if (overlap) return t('crops.validation.overlap', { code: overlap.code });
          }
        }
        return null;
      },
    },
  });

  const openAdd = useCallback(() => {
    form.setValues(blankCropForm(codePreview));
    form.resetDirty();
    formHandlers.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form identity is stable across renders
  }, [formHandlers]);

  const location = useLocation();
  const addCropRequested = (location.state as { addCrop?: boolean } | null)?.addCrop === true;
  useEffect(() => {
    if (!addCropRequested || !canCreate) return;
    openAdd();
    navigate(location.pathname, { replace: true, state: null });
  }, [addCropRequested, openAdd, navigate, location.pathname]);

  const handleSubmit = useCallback(
    async (values: CropFormValues) => {
      setSaving(true);
      try {
        if (values.status === 'growing') {
          const occupant = findGrowingCropInGreenhouse(
            useCropStore.getState().items as Crop[],
            greenhouse.code,
          );
          if (occupant) {
            notifications.show({
              color: 'red',
              message: t('crops.notifications.occupied', { code: occupant.code }),
              autoClose: 8000,
            });
            setSaving(false);
            return;
          }
        }
        const toDate = windowEndDate(values.fromDate, Number(values.totalDates));
        const extra: CropExtra = {
          ...(values.notes.trim() && { notes: values.notes.trim() }),
          ...(values.fromDate && { fromDate: values.fromDate }),
          ...(toDate && { toDate }),
          ...(values.plantType.trim() && { plantType: values.plantType.trim() }),
          ...(values.numberOfSeeds !== '' && { numberOfSeeds: Number(values.numberOfSeeds) }),
          ...(values.growingMedium.trim() && { growingMedium: values.growingMedium.trim() }),
          ...(values.picId && { picId: values.picId }),
          ...(values.diaryTemplateCode && { diaryTemplateCode: values.diaryTemplateCode }),
        };
        const created = await useCropStore.getState().createSafely({
          patch: {
            code: values.code,
            name: values.name.trim(),
            greenhouseCode: greenhouse.code,
            status: values.status,
            ...(values.status === 'growing' && { plantedAt: Date.now() }),
            extra,
          },
        });
        notifications.show({ color: 'green', message: t('crops.notifications.createSuccess') });

        try {
          await autoApplyDiaryTemplateOnCreate({
            diaryTemplateCode: values.diaryTemplateCode,
            fromDate: values.fromDate,
            cropId: created.id,
            cropCode: created.code,
          });
        } catch {
          notifications.show({
            color: 'yellow',
            message: t('cropDiaries.notifications.applyTemplateError'),
            autoClose: 8000,
          });
        }
        formHandlers.close();

        setTab('active');
      } catch {
        notifications.show({
          color: 'red',
          message: t('crops.notifications.createError'),
          autoClose: 8000,
        });
      } finally {
        setSaving(false);
      }
    },
    [greenhouse.code, t, formHandlers],
  );

  const goToCrop = useCallback(
    (crop: Crop) => {
      navigate(ROUTES.CROPS.DETAIL.replace(':id', crop.id), {
        state: {
          backTo: ROUTES.GREENHOUSES.DETAIL.replace(':id', greenhouse.id),
          backLabelKey: 'crops.backToGreenhouse',
        },
      });
    },
    [navigate, greenhouse.id],
  );

  if (!canView) return null;

  const list = tab === 'harvested' ? harvested : activeCrops;
  const listLoading =
    tab === 'harvested' ? harvestedLoading && !harvestedLoaded : cropsLoading && !cropsInitialized;
  const emptyMessage =
    tab === 'harvested' ? t('crops.sectionEmptyHarvested') : t('crops.sectionEmptyActive');

  return (
    <Card withBorder radius="md" padding={isMobile ? 'md' : 'lg'}>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <ThemeIcon size={28} radius="md" variant="light" color="primary">
            <IconPlant2 size={16} stroke={1.75} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            {t('crops.sectionTitle')}
          </Text>
        </Group>
        {canCreate && (
          <Button
            onClick={openAdd}
            size="compact-sm"
            variant="light"
            leftSection={<IconPlus size={14} />}
          >
            {t('crops.addItem')}
          </Button>
        )}
      </Group>

      <SegmentedControl
        value={tab}
        onChange={(v) => setTab(v as CropTab)}
        data={[
          { value: 'active', label: t('crops.tab.active') },
          { value: 'harvested', label: t('crops.tab.harvested') },
        ]}
        fullWidth={isMobile}
        size="xs"
        mb="md"
      />

      {tab === 'harvested' && (
        <Group grow={isMobile} wrap={isMobile ? 'wrap' : 'nowrap'} align="flex-end" mb="md">
          <MonthPickerInput
            label={t('crops.history.fromMonth')}
            placeholder={t('crops.history.fromMonth')}
            valueFormat="MMM YYYY"
            size="sm"
            leftSection={<IconCalendar size={16} />}
            value={monthRange[0]}
            maxDate={monthRange[1] ?? undefined}
            onChange={(v) => setMonthRange([v, monthRange[1]])}
            clearable={false}
            w={isMobile ? undefined : 200}
          />
          <MonthPickerInput
            label={t('crops.history.toMonth')}
            placeholder={t('crops.history.toMonth')}
            valueFormat="MMM YYYY"
            size="sm"
            leftSection={<IconCalendar size={16} />}
            value={monthRange[1]}
            minDate={monthRange[0] ?? undefined}
            onChange={(v) => setMonthRange([monthRange[0], v])}
            clearable={false}
            w={isMobile ? undefined : 200}
          />
        </Group>
      )}

      {listLoading ? (
        <Group justify="center" py="md">
          <Loader size="sm" />
        </Group>
      ) : list.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="md">
          {emptyMessage}
        </Text>
      ) : (
        <Stack gap={0}>
          {list.map((crop, i) => (
            <div key={crop.id}>
              {i > 0 && <Divider />}
              <Group
                justify="space-between"
                wrap="nowrap"
                py="xs"
                gap="sm"
                onClick={() => goToCrop(crop)}
                style={{ cursor: 'pointer' }}
              >
                <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                  <Text size="sm" fw={600} truncate>
                    {crop.name}
                  </Text>
                  <Text size="xs" c="dimmed" ff="monospace" tt="uppercase">
                    {crop.code}
                  </Text>
                </Stack>
                <Group gap="xs" wrap="nowrap">
                  <CropStatusBadge status={crop.status} />
                  <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
                </Group>
              </Group>
            </div>
          ))}
        </Stack>
      )}

      <ResponsiveModal
        size="xl"
        opened={formOpened}
        onClose={formHandlers.close}
        title={t('crops.addItem')}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label={t('crops.form.greenhouseLabel')}
              value={`${greenhouse.name} (${greenhouse.code})`}
              readOnly
              disabled
            />
            <TextInput
              label={t('common.labels.name')}
              placeholder={t('crops.form.namePlaceholder')}
              withAsterisk
              {...form.getInputProps('name')}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label={t('crops.form.codeAutoLabel')}
                leftSection={<IconHash size={14} />}
                styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
                {...form.getInputProps('code')}
              />
              <Select
                label={t('crops.form.statusLabel')}
                data={[
                  { value: 'planned', label: t('crops.status.planned') },
                  { value: 'growing', label: t('crops.status.growing') },
                ]}
                allowDeselect={false}
                {...form.getInputProps('status')}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DateField
                label={t('crops.form.fromDateLabel')}
                valueFormat="DD/MM/YYYY"
                withAsterisk
                clearable={false}
                leftSection={<IconCalendar size={14} />}
                {...form.getInputProps('fromDate')}
              />
              <NumberInput
                label={t('crops.form.totalDatesLabel')}
                placeholder={t('crops.form.totalDatesPlaceholder')}
                withAsterisk
                min={1}
                allowNegative={false}
                allowDecimal={false}
                leftSection={<IconCalendar size={14} />}
                {...form.getInputProps('totalDates')}
              />
            </SimpleGrid>
            <Divider label={t('crops.form.secondarySection')} labelPosition="left" />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label={t('crops.form.plantTypeLabel')}
                placeholder={t('crops.form.plantTypePlaceholder')}
                {...form.getInputProps('plantType')}
              />
              <NumberInput
                label={t('crops.form.numberOfSeedsLabel')}
                placeholder={t('crops.form.numberOfSeedsPlaceholder')}
                withAsterisk
                min={1}
                allowNegative={false}
                allowDecimal={false}
                {...form.getInputProps('numberOfSeeds')}
              />
              <TextInput
                label={t('crops.form.growingMediumLabel')}
                placeholder={t('crops.form.growingMediumPlaceholder')}
                {...form.getInputProps('growingMedium')}
              />
              <EmployeeSelector
                label={t('crops.form.picLabel')}
                placeholder={t('crops.form.picPlaceholder')}
                clearable
                value={form.values.picId}
                onChange={(sel) => form.setFieldValue('picId', sel?.id ?? null)}
              />
            </SimpleGrid>
            <Select
              label={t('crops.form.diaryTemplateLabel')}
              placeholder={t('crops.form.diaryTemplatePlaceholder')}
              data={templateOptions}
              searchable
              clearable
              value={form.values.diaryTemplateCode}
              onChange={(value) => {
                form.setFieldValue('diaryTemplateCode', value);
                if (value) {
                  const tpl = templates.find((tp) => tp.code === value);
                  if (tpl) form.setFieldValue('totalDates', templateDayCount(tpl));
                }
              }}
            />
            <Textarea
              label={t('__new__.01-common.labels.note')}
              placeholder={t('crops.form.notesPlaceholder')}
              autosize
              minRows={2}
              maxRows={6}
              {...form.getInputProps('notes')}
            />
            <Group justify="flex-end" gap="sm">
              <Button variant="default" size="sm" disabled={saving} onClick={formHandlers.close}>
                {t('__new__.01-common.actions.cancel')}
              </Button>
              <Button type="submit" size="sm" loading={saving}>
                {t('crops.form.createButton')}
              </Button>
            </Group>
          </Stack>
        </form>
      </ResponsiveModal>
    </Card>
  );
}
