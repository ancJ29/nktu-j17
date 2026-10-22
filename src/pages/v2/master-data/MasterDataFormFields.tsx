import type { UseFormReturnType } from '@mantine/form';
import type { MasterDataFormValues, MasterDataRow, MasterDataSpec } from './spec';

export function MasterDataFormFields<
  Row extends MasterDataRow,
  Values extends MasterDataFormValues,
>({
  spec,
  form,
  isEditing,
}: {
  readonly spec: MasterDataSpec<Row, Values>;
  readonly form: UseFormReturnType<Values>;
  readonly isEditing: boolean;
}) {
  return (
    <>
      {spec.form.sections.map(({ key, Fields }) => (
        <Fields key={key} form={form} isEditing={isEditing} />
      ))}
    </>
  );
}
