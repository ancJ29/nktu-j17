import { Alert, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUsers } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { credoSmeConnector } from '@credo/connectors/connector';
import type { CredoSmeClientConfig } from '@credo/connectors/types';
import { ConfirmModal } from '@/components/ConfirmModal';
import { AddClientModal } from './AddClientModal';
import { ClientAppConfigPanel } from './ClientAppConfigPanel';
import { ClientsTable } from './ClientsTable';
import { PanelHeader } from './PanelHeader';
import { SSO_ADMIN_KEY_STORAGE, readSecret } from './secrets';
import { SsoAdminKeyField } from './SsoAdminKeyField';

const ssoServiceCodeFor = (clientServiceCode: string) => `c-mngt-${clientServiceCode}`;

const readRequestedCode = (hash: string): string =>
  decodeURIComponent(hash.replace(/^#/, '')).trim();

export function ClientsPanel() {
  const [clients, setClients] = useState<CredoSmeClientConfig[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CredoSmeClientConfig | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [ssoAdminKey, setSsoAdminKey] = useState<string>(() => readSecret(SSO_ADMIN_KEY_STORAGE));

  const location = useLocation();
  const navigate = useNavigate();
  const requestedCode = readRequestedCode(location.hash);

  const configuring = clients?.find((client) => client.clientServiceCode === requestedCode) ?? null;

  const selectClient = useCallback(
    (code: string) => {
      void navigate(
        { pathname: location.pathname, search: location.search, hash: code && `#${code}` },
        { replace: true },
      );
    },
    [navigate, location.pathname, location.search],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await credoSmeConnector.listClients();
      if (!res.success) {
        throw new Error((res as { message?: string }).message ?? 'listClients failed');
      }
      setClients(res.clients);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { clientServiceCode, version } = pendingDelete;
    const issues: string[] = [];

    try {
      const res = await credoSmeConnector.removeClient({
        clientServiceCode,
        version,
        ssoAdminAccessKey: ssoAdminKey.trim(),
      });
      if (!res.success) {
        issues.push(`removeClient: ${(res as { message?: string }).message ?? 'failed'}`);
      }

      if (res.ssoIssues?.length) issues.push(...res.ssoIssues);
    } catch (err) {
      issues.push(`removeClient: ${err instanceof Error ? err.message : String(err)}`);
    }

    setDeleting(false);
    setPendingDelete(null);

    notifications.show(
      issues.length === 0
        ? {
            color: 'green',
            title: 'Client deleted',
            message: `${clientServiceCode} removed from credo-sme and credo-sso.`,
          }
        : { color: 'yellow', title: 'Partial deletion', message: issues.join(' · ') },
    );
    void load();
  }, [pendingDelete, ssoAdminKey, load]);

  if (configuring) {
    return <ClientAppConfigPanel client={configuring} onBack={() => selectClient('')} />;
  }

  return (
    <Stack gap="lg">
      <PanelHeader
        icon={<IconUsers size={22} style={{ opacity: 0.6 }} />}
        title="Clients"
        subtitle="The client register, read through credo-sme. Deleting also removes the matching credo-sso service."
      />

      {/* Only once the register has ANSWERED: while `clients` is null the code
          is unresolved, not absent, and saying so mid-load would accuse every
          deep link of being broken for as long as the list takes to arrive. */}
      {clients && requestedCode && (
        <Alert color="yellow" variant="light" title="No such client">
          The link asks for <strong>{requestedCode}</strong>, which is not in this register. It may
          have been deleted, or the code may be misspelt — pick one below.
        </Alert>
      )}

      <ClientsTable
        clients={clients}
        loading={loading}
        loadError={loadError}
        onRefresh={() => void load()}
        onAdd={() => setAddOpen(true)}
        onConfigure={(client) => selectClient(client.clientServiceCode)}
        onDelete={setPendingDelete}
      />

      <AddClientModal
        opened={addOpen}
        onClose={() => setAddOpen(false)}
        ssoAdminKey={ssoAdminKey}
        onSsoAdminKeyChange={setSsoAdminKey}
        onProvisioned={() => void load()}
      />

      <ConfirmModal
        opened={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
        title="Delete client?"
        message={
          pendingDelete
            ? `This will remove client "${pendingDelete.clientServiceCode}" and all its per-client data, plus the matching credo-sso service "${ssoServiceCodeFor(pendingDelete.clientServiceCode)}". Cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        confirmColor="red"
        loading={deleting}
        confirmDisabled={!ssoAdminKey.trim()}
      >
        <SsoAdminKeyField value={ssoAdminKey} onChange={setSsoAdminKey} action="deletion" />
      </ConfirmModal>
    </Stack>
  );
}
