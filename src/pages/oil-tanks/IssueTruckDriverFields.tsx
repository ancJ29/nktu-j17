import { Select, SimpleGrid, TextInput } from '@mantine/core';
import type {
  OperationLogConfig,
  OperationLogContext,
} from '@/pages/operation-logs/operationLogConfig';

export function IssueTruckDriverFields({
  form,
  t,
  ctx,
}: {
  form: Parameters<OperationLogConfig['renderFields']>[0];
  t: (key: string) => string;
  ctx?: OperationLogContext;
}) {
  const options = ctx?.truckOptions;
  const bound = String(form.values.truckId ?? '').trim();
  if (!options?.length && !bound) return null;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <Select
        label={t('oilTanks.logs.issue.columns.truck')}
        placeholder={t('oilTanks.logs.issue.form.truckPlaceholder')}
        data={options ?? []}
        searchable
        clearable
        value={bound || null}
        onChange={(value) => {
          const picked = options?.find((o) => o.value === value);
          form.setFieldValue('truckId', value ?? '');
          form.setFieldValue('truckCode', picked?.code ?? '');

          if (picked?.driverName) form.setFieldValue('driverName', picked.driverName);
          if (!value) form.setFieldValue('driverName', '');
        }}
      />
      <TextInput
        label={t('oilTanks.logs.issue.columns.driver')}
        placeholder={t('oilTanks.logs.issue.form.driverPlaceholder')}
        {...form.getInputProps('driverName')}
      />
    </SimpleGrid>
  );
}
