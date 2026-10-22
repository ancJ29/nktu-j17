import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Code,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconPlus, IconRefresh, IconSettings, IconTrash, IconUsers } from '@tabler/icons-react';
import type { CredoSmeClientConfig } from '@credo/connectors/types';
import { SectionCard } from '@/components/SectionCard';

export function ClientsTable({
  clients,
  loading,
  loadError,
  onRefresh,
  onAdd,
  onConfigure,
  onDelete,
}: {
  clients: CredoSmeClientConfig[] | null;
  loading: boolean;
  loadError: string | null;
  onRefresh: () => void;
  onAdd: () => void;
  onConfigure: (client: CredoSmeClientConfig) => void;
  onDelete: (client: CredoSmeClientConfig) => void;
}) {
  return (
    <SectionCard
      icon={<IconUsers size={14} />}
      title="Registered clients"
      padding="md"
      actions={
        <Group gap="xs" wrap="nowrap">
          <Button size="compact-sm" leftSection={<IconPlus size={14} />} onClick={onAdd}>
            Add client
          </Button>
          <Tooltip label="Refresh" withArrow>
            <ActionIcon variant="subtle" onClick={onRefresh} loading={loading}>
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      }
    >
      {loading && !clients && (
        <Group justify="center" py="lg">
          <Loader size="sm" />
        </Group>
      )}

      {loadError && (
        <Alert color="red" variant="light">
          {loadError}
        </Alert>
      )}

      {clients && clients.length === 0 && !loadError && (
        <Text size="sm" c="dimmed" ta="center" py="md">
          No clients yet.
        </Text>
      )}

      {clients && clients.length > 0 && (
        <Table.ScrollContainer minWidth={600}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Domains</Table.Th>
                <Table.Th>Active</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {clients.map((c) => (
                <ClientRow
                  key={c.clientServiceCode}
                  client={c}
                  onConfigure={onConfigure}
                  onDelete={onDelete}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </SectionCard>
  );
}

function ClientRow({
  client,
  onConfigure,
  onDelete,
}: {
  client: CredoSmeClientConfig;
  onConfigure: (client: CredoSmeClientConfig) => void;
  onDelete: (client: CredoSmeClientConfig) => void;
}) {
  return (
    <Table.Tr>
      <Table.Td>
        <Code>{client.clientServiceCode}</Code>
      </Table.Td>
      <Table.Td>{client.clientName}</Table.Td>
      <Table.Td>
        {client.domains.length > 0 ? (
          <Stack gap="xs">
            {client.domains.map((d, idx) => (
              <Anchor
                href={`https://${d}`}
                target="_blank"
                key={idx}
                size="xs"
                c="dimmed"
                style={{ wordBreak: 'break-all' }}
              >
                {`https://${d}`}
              </Anchor>
            ))}
          </Stack>
        ) : (
          <Text size="xs" c="dimmed">
            -
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Badge
          size="sm"
          color={client.isActive ? 'green' : 'gray'}
          variant={client.isActive ? 'light' : 'outline'}
        >
          {client.isActive ? 'active' : 'disabled'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">
          {client.createdAt ? new Date(client.createdAt).toISOString().slice(0, 10) : '—'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Button
            size="compact-xs"
            variant="subtle"
            leftSection={<IconSettings size={12} />}
            onClick={() => onConfigure(client)}
          >
            Configure
          </Button>
          <Button
            size="compact-xs"
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={12} />}
            onClick={() => onDelete(client)}
          >
            Delete
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}
