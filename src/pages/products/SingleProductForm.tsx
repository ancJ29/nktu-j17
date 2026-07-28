import {
  ActionIcon,
  Button,
  Grid,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import JsBarcode from 'jsbarcode';
import { lookupLabelOf, useLookupLabels, useLookupOptions } from '@/hooks';
import {
  IconAdjustmentsHorizontal,
  IconBarcode,
  IconBoxMultiple,
  IconCategory,
  IconCurrencyDong,
  IconFileDescription,
  IconPackage,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/SectionCard';
import { ProductSelector } from '@/components/selectors/ProductSelector';
import { useProductStore } from '@/stores/useProductStore';
import type { ProductSetItem, UnitConversion } from '@/types';
import { isProductSet } from '@/utils/productSet';
import { appConfig } from '@/config';
import { hasBarcodeForProducts, perms } from '@/utils/permission';

export type ProductFormValues = {
  name: string;
  code: string;
  description: string;

  units: string[];

  price: number;
  isActive: boolean;
  alternativeNames: string[];

  sku: string;
  barcode: string;
  basePrice: number;

  suggestedPrice: number;
  category: string;
  tags: string[];
  attributes: Array<{ key: string; value: string }>;
  minInventoryValue: number | '';
  minInventoryUnit: string;

  noInventory: boolean;
  unitConversions: UnitConversion[];

  setItems: ProductSetItem[];
};

const barcodeEnabled = hasBarcodeForProducts();

const canManagePrice = perms.product.canManagePrice();

type SingleProductFormProps = {
  readonly form: UseFormReturnType<ProductFormValues>;
  readonly isLoading: boolean;
  readonly isEditMode: boolean;

  readonly onSkuChange: (value: string) => void;
  readonly onSubmit: (values: ProductFormValues) => void;
  readonly onCancel: () => void;
};

function UnitConversionsEditor({
  form,
  selectedUnits,
}: {
  form: UseFormReturnType<ProductFormValues>;
  selectedUnits: { value: string; label: string }[];
}) {
  const { t } = useTranslation();
  const conversions = form.values.unitConversions;

  const addRow = () => {
    form.setFieldValue('unitConversions', [
      ...conversions,
      { unit: '', quantity: 1, baseUnit: '' },
    ]);
  };

  const removeRow = (idx: number) => {
    form.setFieldValue(
      'unitConversions',
      conversions.filter((_, i) => i !== idx),
    );
  };

  const updateRow = (idx: number, patch: Partial<UnitConversion>) => {
    form.setFieldValue(
      'unitConversions',
      conversions.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  };

  if (selectedUnits.length < 2 && conversions.length === 0) return null;

  return (
    <Stack gap="xs">
      {conversions.map((row, idx) => (
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
        {form.errors.unitConversions && (
          <Text size="xs" c="red">
            {form.errors.unitConversions}
          </Text>
        )}
      </Group>
    </Stack>
  );
}

function SetCompositionEditor({
  form,
  selfCode,
}: {
  form: UseFormReturnType<ProductFormValues>;
  selfCode: string;
}) {
  const { t } = useTranslation();
  const products = useProductStore((s) => s.items);
  const items = form.values.setItems;

  const unitLabels = useLookupLabels('unit');

  const componentFilter = useMemo(
    () => (p: (typeof products)[number]) =>
      !p.extra?.isDeleted && p.code !== selfCode && !isProductSet(p),
    [selfCode],
  );

  const productByCode = useMemo(() => {
    const m = new Map<string, (typeof products)[number]>();
    for (const p of products) m.set(p.code, p);
    return m;
  }, [products]);

  const addRow = () => {
    form.setFieldValue('setItems', [...items, { productCode: '', quantity: 1, unit: '' }]);
  };

  const removeRow = (idx: number) => {
    form.setFieldValue(
      'setItems',
      items.filter((_, i) => i !== idx),
    );
  };

  const updateRow = (idx: number, patch: Partial<ProductSetItem>) => {
    form.setFieldValue(
      'setItems',
      items.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  };

  if (items.length === 0) {
    return (
      <Stack gap="xs">
        <Text size="xs" c="dimmed">
          {t('products.form.setItemsDesc')}
        </Text>
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconPlus size={13} />}
          onClick={addRow}
          style={{ alignSelf: 'flex-start' }}
        >
          {t('products.form.setItemAdd')}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed">
        {t('products.form.setItemsDesc')}
      </Text>
      {items.map((row, idx) => {
        const picked = row.productCode ? productByCode.get(row.productCode) : undefined;
        const unitOptions = picked
          ? (picked.extra?.units?.length
              ? picked.extra.units
              : picked.unit
                ? [picked.unit]
                : []
            ).map((u) => ({ value: u, label: lookupLabelOf(unitLabels, u, u) }))
          : [];
        return (
          <Group key={idx} gap="xs" wrap="nowrap" align="flex-end">
            <ProductSelector
              placeholder={t('products.form.setItemProductPlaceholder')}
              code={row.productCode || null}
              onChange={(sel) => {
                if (!sel) {
                  updateRow(idx, { productCode: '', unit: '' });
                  return;
                }

                updateRow(idx, {
                  productCode: sel.code,
                  unit: row.unit && sel.units.includes(row.unit) ? row.unit : (sel.units[0] ?? ''),
                });
              }}
              filter={componentFilter}
              style={{ flex: 2 }}
            />
            <NumberInput
              min={0.001}
              step={1}
              placeholder={t('common.labels.quantity')}
              value={row.quantity}
              onChange={(v) => updateRow(idx, { quantity: typeof v === 'number' ? v : 1 })}
              style={{ width: 100 }}
            />
            <Select
              placeholder={t('common.labels.unit')}
              data={unitOptions}
              disabled={unitOptions.length === 0}
              searchable={false}
              allowDeselect={false}
              value={row.unit || null}
              onChange={(v) => updateRow(idx, { unit: v ?? '' })}
              style={{ width: 110 }}
            />
            <ActionIcon variant="subtle" color="red" size="lg" onClick={() => removeRow(idx)}>
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        );
      })}
      <Group gap="sm" align="center">
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconPlus size={13} />}
          onClick={addRow}
        >
          {t('products.form.setItemAdd')}
        </Button>
        {form.errors.setItems && (
          <Text size="xs" c="red">
            {form.errors.setItems}
          </Text>
        )}
      </Group>
    </Stack>
  );
}

function BarcodePreview({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [valid, setValid] = useState(true);

  useEffect(() => {
    if (!svgRef.current || !value.trim()) {
      setValid(false);
      return;
    }
    try {
      JsBarcode(svgRef.current, value.trim(), {
        format: 'CODE128',
        height: 50,
        displayValue: false,
        margin: 0,
      });

      setValid(true);
    } catch {
      setValid(false);
    }
  }, [value]);

  if (!value.trim() || !valid) return null;

  return <svg ref={svgRef} style={{ maxWidth: '100%' }} />;
}

function AttributesField({ form }: { form: UseFormReturnType<ProductFormValues> }) {
  const { t } = useTranslation();
  const attrs = form.values.attributes;

  const updateRow = (idx: number, patch: Partial<{ key: string; value: string }>) => {
    form.setFieldValue(
      'attributes',
      attrs.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  };

  const removeRow = (idx: number) => {
    form.setFieldValue(
      'attributes',
      attrs.filter((_, i) => i !== idx),
    );
  };

  const addRow = () => {
    form.setFieldValue('attributes', [...attrs, { key: '', value: '' }]);
  };

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

function AlternativeNamesField({ form }: { form: UseFormReturnType<ProductFormValues> }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const addName = () => {
    const trimmed = draft.trim();
    if (!trimmed || form.values.alternativeNames.includes(trimmed)) return;
    form.setFieldValue('alternativeNames', [...form.values.alternativeNames, trimmed]);
    setDraft('');
  };

  const removeName = (idx: number) => {
    form.setFieldValue(
      'alternativeNames',
      form.values.alternativeNames.filter((_, i) => i !== idx),
    );
  };

  return (
    <Stack gap={4}>
      <TextInput
        label={t('products.form.alternativeNamesLabel')}
        description={t('products.form.alternativeNamesDesc')}
        placeholder={t('products.form.alternativeNamesPlaceholder')}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addName();
          }
        }}
      />
      {form.values.alternativeNames.map((name, idx) => (
        <Group key={idx} gap={4} wrap="nowrap">
          <Text size="sm" style={{ flex: 1 }}>
            {name}
          </Text>
          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeName(idx)}>
            <IconTrash size={13} />
          </ActionIcon>
        </Group>
      ))}
    </Stack>
  );
}

export function SingleProductForm({
  form,
  isLoading,
  isEditMode,
  onSkuChange,
  onSubmit,
  onCancel,
}: SingleProductFormProps) {
  const { t } = useTranslation();

  const categoryOptions = useLookupOptions('product-category');
  const unitOptions = useLookupOptions('unit');
  const tagOptions = useLookupOptions('product-tag');
  const categoryData = useMemo(
    () => categoryOptions.map((o) => ({ value: o.value, label: o.label })),
    [categoryOptions],
  );
  const unitData = useMemo(
    () => unitOptions.map((o) => ({ value: o.value, label: o.label })),
    [unitOptions],
  );

  const tagData = useMemo(() => tagOptions.map((o) => o.label), [tagOptions]);

  const selectedUnitData = useMemo(
    () =>
      form.values.units.map((v) => ({
        value: v,
        label: unitOptions.find((o) => o.value === v)?.label ?? v,
      })),
    [form.values.units, unitOptions],
  );

  const primaryCard = (
    <SectionCard icon={<IconPackage size={14} />} title={t('products.form.primaryDetails')}>
      <Stack gap="md">
        <TextInput
          label={t('common.labels.name')}
          placeholder={t('products.form.namePlaceholder')}
          withAsterisk
          {...form.getInputProps('name')}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label={t('common.labels.sku')}
            placeholder={t('products.form.skuPlaceholder')}
            description={isEditMode ? undefined : t('products.form.skuCreateDescription')}
            styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}

            disabled={isEditMode}
            {...form.getInputProps('sku')}
            {...(!isEditMode && {
              onChange: (e: ChangeEvent<HTMLInputElement>) => onSkuChange(e.currentTarget.value),
            })}
          />
          <Select
            label={t('common.labels.category')}
            placeholder={t('products.form.categoryPlaceholder')}
            leftSection={<IconCategory size={14} />}
            data={categoryData}
            searchable={false}
            allowDeselect
            {...form.getInputProps('category')}
          />
        </SimpleGrid>
        {appConfig.features.products.priceManagement && canManagePrice && (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NumberInput
              label={t('__new__.07-entities.products.labels.basePriceLabel')}
              placeholder={t('products.form.pricePlaceholder')}
              min={0}
              thousandSeparator=","
              leftSection={<IconCurrencyDong size={14} />}
              {...form.getInputProps('basePrice')}
            />
            <NumberInput
              label={t('products.form.priceLabel')}
              placeholder={t('products.form.pricePlaceholder')}
              min={0}
              thousandSeparator=","
              leftSection={<IconCurrencyDong size={14} />}
              {...form.getInputProps('price')}
            />
            <NumberInput
              label={t('products.form.suggestedPriceLabel')}
              description={t('products.form.suggestedPriceDescription')}
              placeholder={t('products.form.pricePlaceholder')}
              min={0}
              thousandSeparator=","
              leftSection={<IconCurrencyDong size={14} />}
              {...form.getInputProps('suggestedPrice')}
            />
          </SimpleGrid>
        )}
      </Stack>
    </SectionCard>
  );

  const descriptionCard = (
    <SectionCard icon={<IconFileDescription size={14} />} title={t('common.labels.description')}>
      <Textarea
        placeholder={t('products.form.descriptionPlaceholder')}
        autosize
        minRows={3}
        maxRows={8}
        {...form.getInputProps('description')}
      />
      <AlternativeNamesField form={form} />
    </SectionCard>
  );

  const unitsCard = (
    <SectionCard icon={<IconAdjustmentsHorizontal size={14} />} title={t('common.labels.units')}>
      <Stack gap="md">
        <MultiSelect
          label={t('common.labels.unit')}
          placeholder={t('products.form.unitPlaceholder')}
          withAsterisk
          data={unitData}
          searchable={false}
          {...form.getInputProps('units')}
        />
        <UnitConversionsEditor form={form} selectedUnits={selectedUnitData} />
      </Stack>
    </SectionCard>
  );

  const setCompositionCard = (
    <SectionCard
      icon={<IconBoxMultiple size={14} />}
      title={t('products.form.setCompositionTitle')}
    >
      <SetCompositionEditor form={form} selfCode={form.values.code} />
    </SectionCard>
  );

  const classificationCard = (
    <SectionCard icon={<IconCategory size={14} />} title={t('products.form.classificationSection')}>
      <Stack gap="md">
        <TagsInput
          label={t('products.form.tagsLabel')}
          placeholder={t('products.form.tagsPlaceholder')}
          clearable
          data={tagData}
          {...form.getInputProps('tags')}
        />
        <AttributesField form={form} />
      </Stack>
    </SectionCard>
  );

  const barcodeCard = barcodeEnabled ? (
    <SectionCard icon={<IconBarcode size={14} />} title={t('common.labels.barcode')}>
      <Stack gap="md">
        <TextInput
          placeholder={t('products.form.barcodePlaceholder')}
          leftSection={<IconBarcode size={14} />}
          styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
          {...form.getInputProps('barcode')}
        />
        <BarcodePreview value={form.values.barcode} />
      </Stack>
    </SectionCard>
  ) : null;

  const noInventory = form.values.noInventory;
  const inventoryCard = (
    <SectionCard icon={<IconPlus size={14} />} title={t('common.columns.minStock')} padding="xs">
      <Stack gap="xs">
        <Switch
          label={t('products.form.noInventoryLabel')}
          description={t('products.form.noInventoryDescription')}
          {...form.getInputProps('noInventory', { type: 'checkbox' })}
        />
        {!noInventory && (
          <>
            <Text size="xs" c="dimmed">
              {t('products.form.minimumInventoryDesc')}
            </Text>
            <Group gap="md" grow align="flex-end">
              <NumberInput
                min={0}
                step={1}
                placeholder="0"
                {...form.getInputProps('minInventoryValue')}
              />
              <Select
                placeholder={t('products.form.minimumInventoryUnitPlaceholder')}
                data={selectedUnitData}
                searchable={false}
                allowDeselect
                {...form.getInputProps('minInventoryUnit')}
              />
            </Group>
          </>
        )}
      </Stack>
    </SectionCard>
  );

  const statusCard = isEditMode ? (
    <SectionCard
      icon={<IconCategory size={14} />}
      title={t('__new__.01-common.labels.status')}
      padding="md"
    >
      <Switch
        label={t('products.form.isActiveLabel')}
        {...form.getInputProps('isActive', { type: 'checkbox' })}
      />
    </SectionCard>
  ) : null;

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="md">
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="md">
              {primaryCard}
              {descriptionCard}
              {classificationCard}
              {barcodeCard}
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="md">
              {unitsCard}
              {setCompositionCard}
              {inventoryCard}
              {statusCard}
            </Stack>
          </Grid.Col>
        </Grid>

        <Group justify="flex-end" gap="sm">
          <Button variant="default" size="sm" disabled={isLoading} onClick={onCancel}>
            {t('__new__.01-common.actions.cancel')}
          </Button>
          <Button type="submit" loading={isLoading} size="sm">
            {isEditMode ? t('products.form.updateButton') : t('products.form.createButton')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
