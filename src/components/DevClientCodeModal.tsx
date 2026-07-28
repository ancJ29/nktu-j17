import { resolveClientCode, setClientCode } from '@/config/client-code';
import { Button, Divider, Group, Modal, Space, Switch, Text, TextInput } from '@mantine/core';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { useState } from 'react';
import { ADMIN_CONFIG_KEY, appApiGroup, getAdminConfigValue, setAppApiGroup } from '@/config/env';
import { reloadPage } from '@credo/base-ui/utils';
import { forceClearCache } from '@/utils/forceClearCache';
import { appConfig } from '@/config';
import { isProduction } from '@/config/env';

const hotKey = isProduction ? 'mod+shift+K' : 'mod+G';

export function DevClientCodeModal() {
  const [opened, { open, close }] = useDisclosure(false);
  const [value, setValue] = useState(() => resolveClientCode());
  const [apiGroup, setApiGroup] = useState(() => appApiGroup);
  const [adminConfig, setAdminConfig] = useState(() => !!getAdminConfigValue());
  const [adminConfigValue, setAdminConfigValue] = useState(getAdminConfigValue);

  useHotkeys([[hotKey, open]]);

  const handleSubmit = () => {
    let needsReload = false;

    const trimmed = value.trim();
    if (trimmed && trimmed !== resolveClientCode()) {
      setClientCode(trimmed);
      return;
    }

    if (apiGroup && apiGroup !== appApiGroup) {
      setAppApiGroup(apiGroup);
      needsReload = true;
    }

    const currentValue = getAdminConfigValue();
    if (adminConfig && adminConfigValue.trim()) {
      if (adminConfigValue.trim() !== currentValue) {
        localStorage.setItem(ADMIN_CONFIG_KEY, adminConfigValue.trim());
        needsReload = true;
      }
    } else if (currentValue) {
      localStorage.removeItem(ADMIN_CONFIG_KEY);
      needsReload = true;
    }

    if (needsReload) {
      reloadPage('dev client-code or admin config change');
    } else {
      close();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={
        <Text size="xl" fw={600}>
          Dev Tools (Cmd+G)
        </Text>
      }
      size="sm"
    >
      <TextInput
        label="Client Code"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
        autoFocus
        data-autofocus
      />

      <Space h="md" />

      <TextInput
        label="API Group (developer only)"
        placeholder="Enter API group (e.g. 12b1b2)"
        value={apiGroup}
        onChange={(e) => setApiGroup(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
        autoFocus
        data-autofocus
      />

      <Divider my="md" />

      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text size="sm" fw={500}>
            Admin Config
          </Text>
          <Text size="xs" c="dimmed">
            Show App Config & Debug pages
          </Text>
        </div>
        <Switch checked={adminConfig} onChange={(e) => setAdminConfig(e.currentTarget.checked)} />
      </Group>

      {adminConfig && (
        <TextInput
          mt="xs"
          placeholder="Enter admin config key"
          value={adminConfigValue}
          onChange={(e) => setAdminConfigValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
      )}

      <Button mt="md" fullWidth onClick={handleSubmit}>
        Apply & Reload
      </Button>

      <Divider my="md" label="Danger zone" labelPosition="center" />

      <Button
        fullWidth
        color="red"
        variant="light"
        onClick={() => {
          forceClearCache().catch(console.error);
        }}
      >
        Force Clear All Cache
      </Button>
      <Text size="xs" c="dimmed" mt={4} ta="center">
        Wipes localStorage, IndexedDB, service-worker caches, cookies
      </Text>
      <Text size="xs" c="dimmed" ta="right" ff="monospace">
        Build timestamp: {appConfig.build?.buildTimestampReadable}
      </Text>
    </Modal>
  );
}
