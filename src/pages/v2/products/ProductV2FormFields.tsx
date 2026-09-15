import {
  ActionIcon,
  Button,
  Grid,
  Group,
  NumberInput,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconCurrencyDong, IconPlus, IconTrash } from '@tabler/icons-react';
import { LookupSelect } from '@/components/LookupSelect';
import { useTranslation } from 'react-i18next';
import type { ProductV2Attribute } from '@/types';
import {
  PRODUCT_CATEGORY_CATEGORY,
  PRODUCT_UNIT_CATEGORY,
  type ProductV2FormValues,
} from './productV2Form';

type FieldsProps = {
  readonly form: UseFormReturnType<ProductV2FormValues>;
  readonly isEditing: boolean;
};

export function ProductV2IdentityFields({ form, isEditing }: FieldsProps) {
  const { t } = useTranslation();
  return (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <TextInput
          label={t('common.labels.code')}
          description={t('productsV2.form.codeHelp')}
          placeholder={t('productsV2.form.codeAuto')}
          autoFocus={!isEditing}

          disabled={isEditing}
          {...form.getInputProps('code')}
        />
      </Grid.Col>
      <LookupSelect
        label={t('productsV2.form.unit')}
        category={PRODUCT_UNIT_CATEGORY}
        value={form.values.unit}
        onChange={(v) => form.setFieldValue('unit', v)}
      />
      <Grid.Col span={12}>
        <TextInput label={t('common.labels.name')} withAsterisk {...form.getInputProps('name')} />
      </Grid.Col>
      <LookupSelect
        label={t('productsV2.form.category')}
        category={PRODUCT_CATEGORY_CATEGORY}
        value={form.values.category}
        onChange={(v) => form.setFieldValue('category', v)}
      />
    </Grid>
  );
}

export function ProductV2StockFields({ form }: Omit<FieldsProps, 'isEditing'>) {
  const { t } = useTranslation();
  return (
    <Stack gap="md">
      <NumberInput
        label={t('productsV2.form.minStock')}
        description={t('productsV2.form.minStockHelp')}
        min={0}
        thousandSeparator=","
        disabled={form.values.ignoreStockAlert}
        {...form.getInputProps('minStock')}
      />
      {/* The threshold above is what this silences, so it sits under it — and
          the input greys out rather than disappearing, because the stored
          threshold survives the switch and comes back with it. */}
      <Switch
        label={t('productsV2.form.ignoreStockAlert')}
        description={t('productsV2.form.ignoreStockAlertHelp')}
        {...form.getInputProps('ignoreStockAlert', { type: 'checkbox' })}
      />
    </Stack>
  );
}

export function ProductV2AttributeFields({ form }: Omit<FieldsProps, 'isEditing'>) {
  const { t } = useTranslation();
  const rows = form.values.attributes;

  const setRows = (next: ProductV2Attribute[]) => form.setFieldValue('attributes', next);

  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed">
        {t('productsV2.form.attributesHelp')}
      </Text>
      {rows.map((row, index) => (
        <Group key={index} gap="xs" wrap="nowrap" align="flex-start">
          <TextInput
            aria-label={t('productsV2.form.attributeKey')}
            placeholder={t('productsV2.form.attributeKey')}
            value={row.key}
            onChange={(e) =>
              setRows(rows.map((r, i) => (i === index ? { ...r, key: e.currentTarget.value } : r)))
            }
            style={{ flex: 1 }}
          />
          <TextInput
            aria-label={t('productsV2.form.attributeValue')}
            placeholder={t('productsV2.form.attributeValue')}
            value={row.value}
            onChange={(e) =>
              setRows(
                rows.map((r, i) => (i === index ? { ...r, value: e.currentTarget.value } : r)),
              )
            }
            style={{ flex: 2 }}
          />
          <ActionIcon
            variant="subtle"
            color="red"
            size="lg"
            aria-label={t('common.actions.remove')}
            onClick={() => setRows(rows.filter((_, i) => i !== index))}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ))}
      <Button
        variant="default"
        size="compact-sm"
        leftSection={<IconPlus size={13} />}
        onClick={() => setRows([...rows, { key: '', value: '' }])}
        style={{ alignSelf: 'flex-start' }}
      >
        {t('productsV2.form.attributeAdd')}
      </Button>
    </Stack>
  );
}

export function ProductV2PriceFields({ form }: Omit<FieldsProps, 'isEditing'>) {
  const { t } = useTranslation();
  return (
    <NumberInput
      label={t('productsV2.form.price')}
      placeholder={t('productsV2.form.pricePlaceholder')}
      min={0}
      thousandSeparator=","
      leftSection={<IconCurrencyDong size={14} />}
      {...form.getInputProps('price')}
    />
  );
}

export function ProductV2StatusField({ form }: Omit<FieldsProps, 'isEditing'>) {
  const { t } = useTranslation();
  return (
    <Switch
      label={t('productsV2.status.active')}
      {...form.getInputProps('isActive', { type: 'checkbox' })}
    />
  );
}
