import { Button, Modal, Stack, Text, TextInput } from '@mantine/core';
import { useState } from 'react';
import { resolveClientCode, setClientCode } from '@/config/client-code';
import { useCfgReady, useClientUnconfigured } from '@/utils/bootState';
import { LoadingFallback } from '@credo/base-ui/components';
import { clearAllCache, reloadPage } from '@credo/base-ui/utils';
import { Outlet, useSearchParams } from 'react-router';

export function BaseLayout() {
  const [searchParams] = useSearchParams();

  const cfgReady = useCfgReady();
  const clientUnconfigured = useClientUnconfigured();

  const code = searchParams.get('code')?.trim() ?? '';
  const resolvedCode = resolveClientCode();
  if (code && code !== resolvedCode) {
    clearAllCache();

    setClientCode(code);

    reloadPage('client code change');
  }

  if (!resolvedCode || clientUnconfigured) {
    return <ClientCodePrompt unknownCode={clientUnconfigured ? resolvedCode : undefined} />;
  }

  if (!cfgReady) return <LoadingFallback fullScreen />;

  return <Outlet />;
}

function ClientCodePrompt({ unknownCode }: { unknownCode?: string }) {
  const [value, setValue] = useState('');
  const trimmed = value.trim();
  const submit = () => {
    if (!trimmed) return;

    setClientCode(trimmed);
  };
  return (
    <Modal
      opened
      onClose={() => {}}
      withCloseButton={false}
      closeOnEscape={false}
      closeOnClickOutside={false}
      centered
      title="Client code required"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {unknownCode
            ? `No configuration found for client code "${unknownCode}". Enter a valid client code to continue.`
            : 'No client code is configured for this deployment. Enter the client code to continue.'}
        </Text>
        <TextInput
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          placeholder="e.g. acme"
          autoFocus
          data-autofocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        <Button onClick={submit} disabled={!trimmed}>
          Continue
        </Button>
      </Stack>
    </Modal>
  );
}
