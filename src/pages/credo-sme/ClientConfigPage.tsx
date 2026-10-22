import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useState } from 'react';
import { credoSmeConnector } from '@credo/connectors/connector';
import { AuthGate } from './ClientConfigPage/AuthGate';
import { BrandedShell } from './ClientConfigPage/BrandedShell';
import { ClientsPanel } from './ClientConfigPage/ClientsPanel';
import {
  ADMIN_KEY_STORAGE,
  SSO_ADMIN_KEY_STORAGE,
  readSecret,
  writeSecret,
} from './ClientConfigPage/secrets';

export function ClientConfigPage() {
  const [authed, setAuthed] = useState<boolean>(() => readSecret(ADMIN_KEY_STORAGE).length > 0);

  useEffect(() => {
    if (authed) credoSmeConnector.setAccessKey(readSecret(ADMIN_KEY_STORAGE));
  }, [authed]);

  const handleAuthed = useCallback((accessKey: string) => {
    writeSecret(ADMIN_KEY_STORAGE, accessKey);
    credoSmeConnector.setAccessKey(accessKey.trim());
    setAuthed(true);
  }, []);

  const handleSignOut = useCallback(() => {
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    sessionStorage.removeItem(SSO_ADMIN_KEY_STORAGE);
    credoSmeConnector.setAccessKey('');
    setAuthed(false);
    notifications.show({ color: 'gray', message: 'Signed out — keys cleared.' });
  }, []);

  return (
    <BrandedShell authed={authed} onSignOut={handleSignOut}>
      {authed ? <ClientsPanel /> : <AuthGate onAuthed={handleAuthed} />}
    </BrandedShell>
  );
}
