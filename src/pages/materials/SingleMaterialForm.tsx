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
} from '@mantine/core';
import { type UseFormReturnType } from '@mantine/form';
import {
  IconBox,
  IconCategory,
  IconHash,
  IconPlus,
  IconRuler2,
  IconTrash,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLookupV2Options } from '@/hooks';
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
import type { UnitConversion } from '@/types';

const multiUnit = isMaterialMultiUnit();
const unitCategory = getMaterialUnitCategory();
const hasDescription = hasMaterialDescription();
const hasSpecification = hasMaterialSpecification();
const hasMemo = hasMaterialMemo();
const hasPricing = hasMaterialPricing();
const hasMinimumStock = hasMaterialMinimumStock();
const hasTags = hasMaterialTags();
const hasAttributes = hasMaterialAttributes();

export type MaterialFormValues = {
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

type SingleMaterialFormProps = {
  readonly form: UseFormReturnType<MaterialFormValues>;
  readonly isLoading: boolean;
  readonly isEditMode: boolean;
  readonly onSubmit: (values: MaterialFormValues) => void;
  readonly onCancel: () => void;
};

export function SingleMaterialForm({
  form,
  isLoading,
  isEditMode,
  onSubmit,
  onCancel,
}: SingleMaterialFormProps) {
  const { t } = useTranslation();

  const unitOptions = useLookupV2Options(unitCategory);
  const categoryOptions = useLookupV2Options(MATERIAL_CATEGORY_LOOKUP);

  const selectedUnitData = useMemo(
    () =>
      form.values.units.map((v) => ({
        value: v,
        label: unitOptions.find((o) => o.value === v)?.label ?? v,
      })),
    [form.values.units, unitOptions],
  );

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
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

              {isEditMode && (
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
          <Button variant="default" size="sm" disabled={isLoading} onClick={onCancel}>
            {t('__new__.01-common.actions.cancel')}
          </Button>
          <Button type="submit" loading={isLoading} size="sm">
            {isEditMode ? t('materials.form.updateButton') : t('materials.form.createButton')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
