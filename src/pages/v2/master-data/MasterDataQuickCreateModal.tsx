import { Button, Group, Modal, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Form } from '@/components/Form';
import { MasterDataFormFields } from './MasterDataFormFields';
import { useMasterDataForm, useMasterDataWrites } from './useMasterDataWrites';
import type { MasterDataFormValues, MasterDataRow, MasterDataSpec } from './spec';

export function MasterDataQuickCreateModal<
  Row extends MasterDataRow,
  Values extends MasterDataFormValues,
>({
  spec,
  opened,
  onClose,
  onCreated,
  initialName,
}: {
  readonly spec: MasterDataSpec<Row, Values>;
  readonly opened: boolean;
  readonly onClose: () => void;

  readonly onCreated: (row: Row) => void;

  readonly initialName?: string;
}) {
  const { t } = useTranslation();
  const text = spec.text(t);

  return (
    <Modal opened={opened} onClose={onClose} title={text.addItem} centered size="lg" padding={0}>
      {/* The body mounts with the modal and unmounts with it.

          That is what makes `initialName` land: a `useForm` seeded once at
          this component's mount would take the name the operator typed the
          FIRST time and every later open would reopen on it. It is also what
          the previous comment here claimed was already happening — `Modal`
          unmounts its children, but the form hook lived out here where the
          children are not. Discarding a half-typed row the operator walked
          away from was the other half of that claim, and it is true now. */}
      {opened && (
        <QuickCreateBody
          spec={spec}
          initialName={initialName}
          onClose={onClose}
          onCreated={onCreated}
        />
      )}
    </Modal>
  );
}

function QuickCreateBody<Row extends MasterDataRow, Values extends MasterDataFormValues>({
  spec,
  initialName,
  onClose,
  onCreated,
}: {
  readonly spec: MasterDataSpec<Row, Values>;
  readonly initialName?: string;
  readonly onClose: () => void;
  readonly onCreated: (row: Row) => void;
}) {
  const { t } = useTranslation();
  const text = spec.text(t);
  const { save, busy } = useMasterDataWrites(spec);

  const form = useMasterDataForm(spec, null, initialName);

  const submit = async (values: Values) => {
    const saved = await save(values, null, form);

    if (!saved) return;
    onCreated(saved);
    onClose();
  };

  return (
    <>
      <Form form={form} onSubmit={(values) => void submit(values)}>
        {/* No SectionCards: a dialog is already a card — the list page's
            own dialog makes the same choice for the same reason. */}
        <Stack gap="md" p="md">
          <MasterDataFormFields spec={spec} form={form} isEditing={false} />
        </Stack>
        <Group
          justify="flex-end"
          gap="sm"
          p="md"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Button variant="default" onClick={onClose}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" loading={busy}>
            {text.createButton}
          </Button>
        </Group>
      </Form>
    </>
  );
}
