import type { UserSettingsConfig } from '@credo/kits/types';
import { NumberInput } from '@mantine/core';
import { memo } from 'react';

export const UserSettingsSection = memo(function UserSettingsSection({
  settings,
  onChange,
}: {
  settings: UserSettingsConfig;
  onChange: (settings: UserSettingsConfig) => void;
}) {
  return (
    <NumberInput
      label="Sync Debounce Delay (ms)"
      placeholder="e.g. 300"
      value={settings.syncDebounceDelay}
      onChange={(v) =>
        onChange({ ...settings, syncDebounceDelay: typeof v === 'number' ? v : 300 })
      }
      size="sm"
      min={0}
      max={10000}
      step={50}
      maw={300}
    />
  );
});
