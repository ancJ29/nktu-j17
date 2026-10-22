import { Grid, Stack, Switch, TextInput, Textarea } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { LookupSelect } from '@/components/LookupSelect';
import { CUSTOMER_TYPE_CATEGORY, type CustomerV2FormValues } from './customerV2Form';

type FieldsProps = {
  readonly form: UseFormReturnType<CustomerV2FormValues>;
  readonly isEditing: boolean;
};

export function CustomerV2IdentityFields({ form, isEditing }: FieldsProps) {
  const { t } = useTranslation();
  return (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <TextInput
          label={t('common.labels.code')}
          description={t('customersV2.form.codeHelp')}
          placeholder={t('customersV2.form.codeAuto')}
          autoFocus={!isEditing}

          disabled={isEditing}
          {...form.getInputProps('code')}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <TextInput label={t('common.labels.shortName')} {...form.getInputProps('shortName')} />
      </Grid.Col>
      <Grid.Col span={12}>
        <TextInput label={t('common.labels.name')} withAsterisk {...form.getInputProps('name')} />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <TextInput label={t('common.labels.taxCode')} {...form.getInputProps('taxCode')} />
      </Grid.Col>
      <LookupSelect
        label={t('customersV2.form.customerType')}
        category={CUSTOMER_TYPE_CATEGORY}
        value={form.values.customerType}
        onChange={(v) => form.setFieldValue('customerType', v)}
      />
    </Grid>
  );
}

export function CustomerV2ContactFields({ form }: Omit<FieldsProps, 'isEditing'>) {
  const { t } = useTranslation();
  return (
    <Stack gap="md">
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <TextInput
            label={t('common.columns.contactPerson')}
            {...form.getInputProps('contactPerson')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <TextInput label={t('common.labels.phone')} {...form.getInputProps('phone')} />
        </Grid.Col>
      </Grid>
      <Textarea
        label={t('common.labels.address')}
        autosize
        minRows={2}
        {...form.getInputProps('address')}
      />
      <TextInput
        label={t('__new__.01-common.labels.googleMapUrl')}
        placeholder={t('__new__.01-common.placeholders.googleMapUrl')}
        {...form.getInputProps('addressGoogleMapUrl')}
      />
    </Stack>
  );
}

export function CustomerV2StatusField({ form }: Omit<FieldsProps, 'isEditing'>) {
  const { t } = useTranslation();
  return (
    <Switch
      label={t('__new__.01-common.labels.active')}
      {...form.getInputProps('isActive', { type: 'checkbox' })}
    />
  );
}
