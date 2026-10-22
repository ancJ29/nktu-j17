import {
  ActionIcon,
  Alert,
  Button,
  Code,
  CopyButton,
  Group,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconCheck, IconCopy, IconX } from '@tabler/icons-react';
import type { CredoSmeProvisionClientResponse } from '@credo/connectors/types';

export function ProvisionResult({
  result,
  onDone,
}: {
  result: CredoSmeProvisionClientResponse;
  onDone: () => void;
}) {
  const rows: [string, string][] = [
    ['Client code', result.clientConfig.clientServiceCode],
    ['SSO service code', result.ssoServiceCode],
    ['Operator access key', result.operatorAccessKey],
    ['Root email', result.rootEmail],
    ['Root password', result.rootPassword],
  ];

  return (
    <Stack gap="sm">
      <Alert color="green" variant="light" icon={<IconCheck size={16} />}>
        Client provisioned. The root password is shown only here — copy it now.
      </Alert>
      <Table verticalSpacing="xs">
        <Table.Tbody>
          {rows.map(([label, value]) => (
            <Table.Tr key={label}>
              <Table.Td w={180}>
                <Text size="xs" c="dimmed">
                  {label}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap="xs" wrap="nowrap">
                  <Code style={{ wordBreak: 'break-all' }}>{value}</Code>
                  <CopyButton value={value}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                        <ActionIcon variant="subtle" size="sm" onClick={copy}>
                          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Group justify="flex-end" mt="md">
        <Button onClick={onDone} size="sm" leftSection={<IconX size={16} />}>
          Close
        </Button>
      </Group>
    </Stack>
  );
}
