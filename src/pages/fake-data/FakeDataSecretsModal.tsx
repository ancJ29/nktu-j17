import { Button, Group, Modal, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FAKE_DATA_SECRET_FIELDS,
  clearFakeDataSecrets,
  getFakeDataSecrets,
  saveFakeDataSecrets,
  type FakeDataSecretField,
  type FakeDataSecrets,
} from './fakeDataSecrets';

type Props = {
  opened: boolean;
  onClose: () => void;

  onSaved?: () => void;
};

const PLAIN_FIELDS: ReadonlySet<FakeDataSecretField> = new Set(['storageServiceCode']);

const SECRET_LABELS: Record<FakeDataSecretField, string> = {
  trustedServiceKey: 'CREDO_TRUSTED_SERVICE_KEY',
  cMngtAdminAccessKey: 'C_MNGT_ADMIN_ACCESS_KEY',
  storageServiceCode: 'CREDO_STORAGE_SERVICE_CODE',
  storageAccessKey: 'CREDO_STORAGE_ACCESS_KEY',
  storageInternalAccessKey: 'CREDO_STORAGE_INTERNAL_ACCESS_KEY',
};

export function FakeDataSecretsModal({ opened, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('fakeData.secretsTitle')}
      size="md"
      closeOnClickOutside={false}
    >
      {opened && <SecretsForm onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function SecretsForm({ onClose, onSaved }: Omit<Props, 'opened'>) {
  const { t } = useTranslation();
  const [values, setValues] = useState<FakeDataSecrets>(() => getFakeDataSecrets());

  const canSave = FAKE_DATA_SECRET_FIELDS.every((f) => values[f].trim().length > 0);

  const setField = (field: FakeDataSecretField, v: string) =>
    setValues((prev) => ({ ...prev, [field]: v }));

  const handleSave = () => {
    saveFakeDataSecrets(values);
    onSaved?.();
    onClose();
  };

  const handleClear = () => {
    clearFakeDataSecrets();
    setValues(getFakeDataSecrets());
  };

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        {t('fakeData.secretsHelp')}
      </Text>
      {FAKE_DATA_SECRET_FIELDS.map((field) => {
        const props = {
          key: field,
          label: SECRET_LABELS[field],
          value: values[field],
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            setField(field, e.currentTarget.value),
          autoComplete: 'off',
          spellCheck: false,
        };
        return PLAIN_FIELDS.has(field) ? <TextInput {...props} /> : <PasswordInput {...props} />;
      })}

      <Group justify="space-between" mt="sm">
        <Button variant="subtle" color="red" onClick={handleClear}>
          {t('__new__.01-common.actions.remove')}
        </Button>
        <Button onClick={handleSave} disabled={!canSave}>
          {t('__new__.01-common.actions.save')}
        </Button>
      </Group>
    </Stack>
  );
}
