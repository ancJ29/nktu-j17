import { Affix } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { useState } from 'react';
import { credoGroup } from '@credo/connectors/connector';

export function DebugPanel() {
  const [debug, setDebug] = useState(false);

  useHotkeys([['mod+K', () => setDebug(!debug)]]);

  if (!debug) return null;

  return (
    <Affix position={{ bottom: 10, right: 10 }} fz="xs" c="dimmed">
      {credoGroup}
    </Affix>
  );
}
