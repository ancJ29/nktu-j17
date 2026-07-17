import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Switch,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useForm, type UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconBox,
  IconCategory,
  IconHash,
  IconPlus,
  IconRuler2,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { useMaterialStore, MATERIAL_RECORD_TARGET } from '@/stores/useMaterialStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { device } from '@credo/base-ui/utils';
import { useInitFormFromFetch, useLookupV2Options } from '@/hooks';
import { perms } from '@/utils/permission';
import {
  getMaterialUnitCategory,
  hasMaterialAttributes,
  hasMaterialDescription,
  hasMaterialMemo,
  hasMaterialMinimumStock,
  hasMaterialPricing,
  hasMaterialSpecification,
  hasMaterialTags,
  isMaterialMultiUnit,
  MATERIAL_CATEGORY_LOOKUP,
} from '@/utils/materialConfig';
import { validateUnitConversions } from '@/utils/unitConversion';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';
import type { Material, MaterialExtra, UnitConversion } from '@/types';

const isMobile = device.isMobile;

const multiUnit = isMaterialMultiUnit();
const unitCategory = getMaterialUnitCategory();
const hasDescription = hasMaterialDescription();
const hasSpecification = hasMaterialSpecification();
const hasMemo = hasMaterialMemo();
const hasPricing = hasMaterialPricing();
const hasMinimumStock = hasMaterialMinimumStock();
const hasTags = hasMaterialTags();
const hasAttributes = hasMaterialAttributes();

type MaterialFormValues = {
  name: string;
  code: string;
  isActive: boolean;
  
  units: string[];
  
  category: string;
  
  unitConversions: UnitConversion[];
  
  description: string;
  specification: string;
  memo: string;
  costPrice: number | '';
  
  minimumStock: number | '';
  
  tags: string[];
  attributes: Array<{ key: string; value: string }>;
};

function MaterialAttributesEditor({ form }: { form: UseFormReturnType<MaterialFormValues> }) {
  const { t } = useTranslation();
  const attrs = form.values.attributes;
  const updateRow = (idx: number, patch: Partial<{ key: string; value: string }>) =>
    form.setFieldValue(
      'attributes',
      attrs.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  const removeRow = (idx: number) =>
    form.setFieldValue(
      'attributes',
      attrs.filter((_, i) => i !== idx),
    );
  const addRow = () => form.setFieldValue('attributes', [...attrs, { key: '', value: '' }]);

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {t('products.form.attributesLabel')}
      </Text>
      <Text size="xs" c="dimmed">
        {t('products.form.attributesDesc')}
      </Text>
      {attrs.map((row, idx) => (
        <Group key={idx} gap="xs" wrap="nowrap" align="flex-start">
          <TextInput
            placeholder={t('products.form.attributeKeyPlaceholder')}
            value={row.key}
            onChange={(e) => updateRow(idx, { key: e.currentTarget.value })}
            style={{ flex: 1 }}
          />
          <TextInput
            placeholder={t('products.form.attributeValuePlaceholder')}
            value={row.value}
            onChange={(e) => updateRow(idx, { value: e.currentTarget.value })}
            style={{ flex: 2 }}
          />
          <ActionIcon variant="subtle" color="red" size="lg" onClick={() => removeRow(idx)}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ))}
      <Button
        variant="default"
        size="compact-sm"
        leftSection={<IconPlus size={13} />}
        onClick={addRow}
        style={{ alignSelf: 'flex-start' }}
      >
        {t('products.form.attributeAdd')}
      </Button>
    </Stack>
  );
}

function MaterialUnitConversionsEditor({
  form,
  selectedUnits,
}: {
  form: UseFormReturnType<MaterialFormValues>;
  selectedUnits: { value: string; label: string }[];
}) {
  const { t } = useTranslation();
  const rows = form.values.unitConversions;

  const addRow = () =>
    form.setFieldValue('unitConversions', [...rows, { unit: '', quantity: 1, baseUnit: '' }]);
  const removeRow = (idx: number) =>
    form.setFieldValue(
      'unitConversions',
      rows.filter((_, i) => i !== idx),
    );
  const updateRow = (idx: number, patch: Partial<UnitConversion>) =>
    form.setFieldValue(
      'unitConversions',
      rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        {t('materials.form.unitConversionsLabel')}
      </Text>
      <Text size="xs" c="dimmed">
        {t('materials.form.unitConversionsHint')}
      </Text>
      {rows.map((row, idx) => (
        <Group key={idx} gap="xs" wrap="nowrap" align="flex-end">
          <Text size="sm" fw={500} style={{ whiteSpace: 'nowrap' }}>
            1
          </Text>
          <Select
            placeholder={t('products.form.unitConversionFrom')}
            data={selectedUnits}
            searchable={false}
            allowDeselect={false}
            value={row.unit}
            onChange={(v) => updateRow(idx, { unit: v ?? '' })}
            style={{ flex: 1 }}
          />
          <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            =
          </Text>
          <NumberInput
            min={0.001}
            step={1}
            value={row.quantity}
            onChange={(v) => updateRow(idx, { quantity: typeof v === 'number' ? v : 1 })}
            style={{ width: 90 }}
          />
          <Select
            placeholder={t('products.form.unitConversionTo')}
            data={selectedUnits}
            searchable={false}
            allowDeselect={false}
            value={row.baseUnit}
            onChange={(v) => updateRow(idx, { baseUnit: v ?? '' })}
            style={{ flex: 1 }}
          />
          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeRow(idx)}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ))}
      <Group gap="sm" align="center">
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconPlus size={13} />}
          onClick={addRow}
        >
          {t('products.form.unitConversionAdd')}
        </Button>
        {typeof form.errors.unitConversions === 'string' && (
          <Text size="xs" c="red">
            {form.errors.unitConversions}
          </Text>
        )}
      </Group>
    </Stack>
  );
}

export function MaterialFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  useEffect(() => {
    if (
      isMobile ||
      (isEdit && !perms.material.canEdit()) ||
      (!isEdit && !perms.material.canCreate())
    ) {
      navigate(ROUTES.MATERIALS.LIST, { replace: true });
    }
  }, [navigate, isEdit]);

  const [loading, setLoading] = useState(false);
  const snapshotRef = useRef<Material | null>(null);

  
  
  const unitOptions = useLookupV2Options(unitCategory);
  const categoryOptions = useLookupV2Options(MATERIAL_CATEGORY_LOOKUP);

  const form = useForm<MaterialFormValues>({
    initialValues: {
      name: '',
      code: '',
      isActive: true,
      units: [],
      category: '',
      unitConversions: [],
      description: '',
      specification: '',
      memo: '',
      costPrice: '',
      minimumStock: '',
      tags: [],
      attributes: [],
    },
    validate: {
      name: (v) => (v.trim() ? null : t('common.validation.nameRequired')),
      code: (v) => {
        if (!v.trim()) return t('common.validation.codeRequired');
        
        if (/\s/.test(v)) return t('common.validation.codeNoWhitespace');
        
        if (!/^[a-zA-Z0-9]+$/.test(v)) return t('common.validation.codeSpecialCharacters');
        return null;
      },
      unitConversions: (conversions, values) => {
        
        
        if (!multiUnit || values.units.length < 2) return null;
        const result = validateUnitConversions(values.units, conversions);
        if (result === 'conflict') return t('products.validation.unitConversionConflict');
        if (result === 'disconnected') return t('products.validation.unitsNotConnected');
        return null;
      },
    },
  });

  
  const selectedUnitData = useMemo(
    () =>
      form.values.units.map((v) => ({
        value: v,
        label: unitOptions.find((o) => o.value === v)?.label ?? v,
      })),
    [form.values.units, unitOptions],
  );

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const res = await cMngtConnector.getSingleRecordById(MATERIAL_RECORD_TARGET, { id });
      const m = res.item as Material;
      snapshotRef.current = m;
      return {
        name: m.name,
        code: m.code,
        isActive: m.isActive,
        units: m.extra?.units ?? [],
        category: m.extra?.category ?? '',
        unitConversions: m.extra?.unitConversions ?? [],
        description: m.extra?.description ?? '',
        specification: m.extra?.specification ?? '',
        memo: m.extra?.memo ?? '',
        costPrice: m.extra?.costPrice ?? ('' as const),
        minimumStock: m.extra?.minimumStock ?? ('' as const),
        tags: m.extra?.tags ?? [],
        attributes: m.extra?.attributes ?? [],
      };
    },
    () => {
      notifications.show({ color: 'red', message: t('materials.notifications.fetchError') });
      navigate(ROUTES.MATERIALS.LIST);
    },
  );

  const handleSubmit = useCallback(
    async (values: MaterialFormValues) => {
      setLoading(true);
      
      
      const buildExtra = (base?: MaterialExtra): MaterialExtra => {
        const extra: MaterialExtra = { ...(base ?? {}) };
        extra.units = values.units;
        if (values.category) extra.category = values.category;
        else delete extra.category;
        
        const validConversions =
          multiUnit && values.units.length >= 2
            ? values.unitConversions.filter(
                (c) => c.unit.trim() && c.baseUnit.trim() && c.quantity > 0,
              )
            : [];
        if (validConversions.length > 0) extra.unitConversions = validConversions;
        else delete extra.unitConversions;
        
        
        
        if (hasDescription) {
          if (values.description.trim()) extra.description = values.description.trim();
          else delete extra.description;
        }
        if (hasSpecification) {
          if (values.specification.trim()) extra.specification = values.specification.trim();
          else delete extra.specification;
        }
        if (hasMemo) {
          if (values.memo.trim()) extra.memo = values.memo.trim();
          else delete extra.memo;
        }
        if (hasPricing) {
          if (values.costPrice !== '' && Number(values.costPrice) >= 0)
            extra.costPrice = Number(values.costPrice);
          else delete extra.costPrice;
        }
        if (hasMinimumStock) {
          if (values.minimumStock !== '' && Number(values.minimumStock) >= 0)
            extra.minimumStock = Number(values.minimumStock);
          else delete extra.minimumStock;
        }
        if (hasTags) {
          const cleanTags = [...new Set(values.tags.map((tag) => tag.trim()).filter(Boolean))];
          if (cleanTags.length > 0) extra.tags = cleanTags;
          else delete extra.tags;
        }
        if (hasAttributes) {
          const cleanAttrs = values.attributes
            .map((a) => ({ key: a.key.trim(), value: a.value.trim() }))
            .filter((a) => a.key && a.value);
          if (cleanAttrs.length > 0) extra.attributes = cleanAttrs;
          else delete extra.attributes;
        }
        return extra;
      };
      try {
        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Material snapshot missing');
          const patch = {
            name: values.name.trim(),
            code: values.code.trim(),
            isActive: values.isActive,
            extra: buildExtra(snapshot.extra),
          };
          const before = {
            name: snapshot.name,
            code: snapshot.code,
            isActive: snapshot.isActive,
            extra: snapshot.extra,
          };
          const updated = await useMaterialStore.getState().updateSafely({
            id,
            version: snapshot.version,
            patch,
          });
          snapshotRef.current = updated as Material;
          
          
          
          
          const diff = deepDiff(before, patch);
          const onlyIsActive = Object.keys(diff).length === 1 && 'isActive' in diff;
          if (onlyIsActive) {
            logActivity(values.isActive ? 'material.enable' : 'material.disable', id);
          } else {
            logActivity('material.update', id, diff);
          }
          notifications.show({
            color: 'green',
            message: t('materials.notifications.updateSuccess'),
          });
          navigate(ROUTES.MATERIALS.DETAIL.replace(':id', id));
        } else {
          
          
          const created = await useMaterialStore.getState().createSafely({
            patch: {
              name: values.name.trim(),
              code: values.code.trim(),
              isActive: true,
              extra: buildExtra(),
            },
          });
          logActivity('material.create', created.id);
          notifications.show({
            color: 'green',
            message: t('materials.notifications.createSuccess'),
          });
          navigate(ROUTES.MATERIALS.DETAIL.replace(':id', created.id));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as Material;
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: isEdit
              ? t('materials.notifications.updateError')
              : t('materials.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, t, navigate],
  );

  const navigateToList = useCallback(() => navigate(ROUTES.MATERIALS.LIST), [navigate]);

  if (fetching) return null;

  const pageTitle = isEdit ? t('materials.editItem') : t('materials.addItem');

  return (
    <Stack gap="lg">
      {!isMobile && (
        <Group gap="sm">
          <Button
            onClick={() => window.history.back()}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('__new__.01-common.actions.back')}
          </Button>
        </Group>
      )}

      <Title order={isMobile ? 4 : 3}>{pageTitle}</Title>

      {/* eslint-disable-next-line react-hooks/refs -- Mantine form.onSubmit() builds the submit handler during render by design; the internal ref read is safe. */}
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Stack gap="md">
                <Card withBorder radius="md" padding="lg">
                  <Group gap="xs" mb="xs">
                    <ThemeIcon size={28} radius="md" variant="light" color="primary">
                      <IconBox size={16} stroke={1.75} />
                    </ThemeIcon>
                    <Text fw={600} size="sm">
                      {t('materials.title')}
                    </Text>
                  </Group>
                  <Divider mb="md" />
                  <Stack gap="md">
                    <TextInput
                      label={t('common.labels.name')}
                      placeholder={t('materials.form.namePlaceholder')}
                      withAsterisk
                      size="md"
                      {...form.getInputProps('name')}
                    />
                    <TextInput
                      label={t('common.labels.code')}
                      leftSection={<IconHash size={14} />}
                      withAsterisk
                      
                      styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
                      {...form.getInputProps('code')}
                    />
                    {categoryOptions.length > 0 && (
                      <Select
                        label={t('materials.form.categoryLabel')}
                        placeholder={t('materials.form.categoryPlaceholder')}
                        leftSection={<IconCategory size={14} />}
                        data={categoryOptions}
                        searchable
                        clearable
                        value={form.values.category || null}
                        onChange={(v) => form.setFieldValue('category', v ?? '')}
                      />
                    )}
                    {hasPricing && (
                      <NumberInput
                        label={t('materials.form.priceLabel')}
                        placeholder={t('materials.form.pricePlaceholder')}
                        min={0}
                        thousandSeparator=","
                        {...form.getInputProps('costPrice')}
                      />
                    )}
                    {hasMinimumStock && (
                      <NumberInput
                        label={t('materials.form.minimumStockLabel')}
                        placeholder={t('materials.form.minimumStockPlaceholder')}
                        description={t('materials.form.minimumStockHint')}
                        min={0}
                        thousandSeparator=","
                        {...form.getInputProps('minimumStock')}
                      />
                    )}
                    {hasSpecification && (
                      <TextInput
                        label={t('materials.form.packagingSpecLabel')}
                        placeholder={t('materials.form.packagingSpecPlaceholder')}
                        {...form.getInputProps('specification')}
                      />
                    )}
                    {hasDescription && (
                      <Textarea
                        label={t('common.labels.description')}
                        placeholder={t('materials.form.descriptionPlaceholder')}
                        autosize
                        minRows={2}
                        maxRows={5}
                        {...form.getInputProps('description')}
                      />
                    )}
                    {hasMemo && (
                      <Textarea
                        label={t('materials.form.memoLabel')}
                        placeholder={t('materials.form.memoPlaceholder')}
                        autosize
                        minRows={2}
                        maxRows={4}
                        {...form.getInputProps('memo')}
                      />
                    )}
                  </Stack>
                </Card>

                {(hasTags || hasAttributes) && (
                  <Card withBorder radius="md" padding="lg">
                    <Group gap="xs" mb="xs">
                      <ThemeIcon size={28} radius="md" variant="light" color="primary">
                        <IconCategory size={16} stroke={1.75} />
                      </ThemeIcon>
                      <Text fw={600} size="sm">
                        {t('products.form.classificationSection')}
                      </Text>
                    </Group>
                    <Divider mb="md" />
                    <Stack gap="md">
                      {hasTags && (
                        <TagsInput
                          label={t('products.form.tagsLabel')}
                          placeholder={t('products.form.tagsPlaceholder')}
                          clearable
                          {...form.getInputProps('tags')}
                        />
                      )}
                      {hasAttributes && <MaterialAttributesEditor form={form} />}
                    </Stack>
                  </Card>
                )}
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Stack gap="md">
                <Card withBorder radius="md" padding="lg">
                  <Group gap="xs" mb="xs">
                    <ThemeIcon size={28} radius="md" variant="light" color="primary">
                      <IconRuler2 size={16} stroke={1.75} />
                    </ThemeIcon>
                    <Text fw={600} size="sm">
                      {t('common.labels.units')}
                    </Text>
                  </Group>
                  <Divider mb="md" />
                  <Stack gap="md">
                    {multiUnit ? (
                      <>
                        <MultiSelect
                          label={t('materials.form.unitsLabel')}
                          placeholder={t('materials.form.unitPickerPlaceholder')}
                          description={t('materials.form.unitsPrimaryHint')}
                          data={unitOptions}
                          searchable
                          clearable
                          {...form.getInputProps('units')}
                        />
                        {form.values.units.length >= 2 && (
                          <MaterialUnitConversionsEditor
                            form={form}
                            selectedUnits={selectedUnitData}
                          />
                        )}
                      </>
                    ) : (
                      <Select
                        label={t('materials.form.unitLabel')}
                        placeholder={t('materials.form.unitPickerPlaceholder')}
                        data={unitOptions}
                        searchable
                        clearable
                        value={form.values.units[0] ?? null}
                        onChange={(v) => form.setFieldValue('units', v ? [v] : [])}
                      />
                    )}
                  </Stack>
                </Card>

                {isEdit && (
                  <Card withBorder radius="md" padding="lg">
                    <Switch
                      label={t('materials.form.isActiveLabel')}
                      {...form.getInputProps('isActive', { type: 'checkbox' })}
                    />
                  </Card>
                )}
              </Stack>
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" disabled={loading} onClick={navigateToList}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button type="submit" loading={loading} size="sm">
              {isEdit ? t('materials.form.updateButton') : t('materials.form.createButton')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
