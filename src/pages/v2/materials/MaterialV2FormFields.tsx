import { Grid, Switch, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { LookupSelect } from '@/components/LookupSelect';
import {
  MATERIAL_CATEGORY_CATEGORY,
  MATERIAL_UNIT_CATEGORY,
  type MaterialV2FormValues,
} from './materialV2Form';

type FieldsProps = {
  readonly form: UseFormReturnType<MaterialV2FormValues>;
  readonly isEditing: boolean;
};

export function MaterialV2IdentityFields({ form, isEditing }: FieldsProps) {
  const { t } = useTranslation();
  return (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <TextInput
          label={t('common.labels.code')}
          description={t('materialsV2.form.codeHelp')}
          placeholder={t('materialsV2.form.codeAuto')}
          autoFocus={!isEditing}

          disabled={isEditing}
          {...form.getInputProps('code')}
        />
      </Grid.Col>
      <LookupSelect
        label={t('materialsV2.form.unit')}
        category={MATERIAL_UNIT_CATEGORY}
        value={form.values.unit}
        onChange={(v) => form.setFieldValue('unit', v)}
      />
      <Grid.Col span={12}>
        <TextInput label={t('common.labels.name')} withAsterisk {...form.getInputProps('name')} />
      </Grid.Col>
      <LookupSelect
        label={t('materialsV2.form.category')}
        category={MATERIAL_CATEGORY_CATEGORY}
        value={form.values.category}
        onChange={(v) => form.setFieldValue('category', v)}
      />
    </Grid>
  );
}

export function MaterialV2StatusField({ form }: Omit<FieldsProps, 'isEditing'>) {
  const { t } = useTranslation();
  return (
    <Switch
      label={t('__new__.01-common.labels.active')}
      {...form.getInputProps('isActive', { type: 'checkbox' })}
    />
  );
}
