import { useEffect, useState } from 'react';

import { Button, CloseButton, Group, Paper, Text, useMantineTheme } from '@mantine/core';

import { FLOATING_PANEL_STYLE } from './styles';

type BeforeInstallPromptEvent = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
} & Event;

export type PWAInstallPromptProps = {
  
  color?: string;
  labels?: {
    installTitle: string;
    installDescription: string;
    maybeLater: string;
    install: string;
  };
};

export function PWAInstallPrompt({ color, labels }: PWAInstallPromptProps) {
  const theme = useMantineTheme();
  const c = color ?? theme.primaryColor;

  const {
    installTitle = 'Install App',
    installDescription = 'Install this app for a better experience',
    maybeLater = 'Maybe Later',
    install = 'Install',
  } = labels ?? {};

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | undefined>();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    globalThis.addEventListener('beforeinstallprompt', handler);
    return () => globalThis.removeEventListener('beforeinstallprompt', handler);
  }, []);

  
  useEffect(() => {
    const handleToggle = () => {
      if (deferredPrompt) {
        setShowInstallPrompt((prev) => !prev);
      }
    };
    window.addEventListener('toggle-pwa-guide', handleToggle);
    return () => window.removeEventListener('toggle-pwa-guide', handleToggle);
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(undefined);
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => setShowInstallPrompt(false);

  if (!showInstallPrompt || !deferredPrompt) return null;

  return (
    <Paper shadow="md" p="md" radius="md" style={FLOATING_PANEL_STYLE}>
      <Group align="start">
        <div style={{ flex: 1 }}>
          <Text size="sm" fw={500} mb={4}>
            {installTitle}
          </Text>
          <Text size="xs" c="dimmed">
            {installDescription}
          </Text>
        </div>
        <CloseButton size="sm" onClick={handleDismiss} />
      </Group>
      <Group mt="md">
        <Button size="xs" variant="light" color={c} onClick={handleDismiss}>
          {maybeLater}
        </Button>
        <Button size="xs" color={c} onClick={handleInstall}>
          {install}
        </Button>
      </Group>
    </Paper>
  );
}
