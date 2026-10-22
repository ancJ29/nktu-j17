import { Alert, Badge, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Translate } from './master-data/spec';

export type ConfigErrorBlock = {
  readonly errors: readonly string[];
  readonly title: string;
  readonly message: string;
};

export type ModuleChrome<Status extends string> = {
  StatusBadge: (props: { readonly status: Status }) => React.ReactNode;
  ConfigAlerts: () => React.ReactNode;
};

export function createModuleChrome<Status extends string>(spec: {
  statusDisplay: (t: Translate, value: Status) => { label: string; color: string };
  configBlocks: (t: Translate) => readonly ConfigErrorBlock[];
}): ModuleChrome<Status> {
  return {
    StatusBadge({ status }) {
      const { t } = useTranslation();
      const { label, color } = spec.statusDisplay(t, status);
      return (
        <Badge color={color} variant="light">
          {label}
        </Badge>
      );
    },

    ConfigAlerts() {
      const { t } = useTranslation();
      return spec
        .configBlocks(t)
        .filter((block) => block.errors.length > 0)
        .map((block) => (
          <Alert
            key={block.title}
            color="red"
            icon={<IconAlertTriangle size={18} />}
            title={block.title}
          >
            <Stack gap={2}>
              <Text size="sm">{block.message}</Text>
              {block.errors.map((error) => (
                <Text key={error} size="xs" c="dimmed">
                  {error}
                </Text>
              ))}
            </Stack>
          </Alert>
        ));
    },
  };
}
