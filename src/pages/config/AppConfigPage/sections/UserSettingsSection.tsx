import type { UserSettingsConfig } from '@credo/kits/types';
import { memo } from 'react';
import { NumberField } from '@/components/NumberField';

export const UserSettingsSection = memo(function UserSettingsSection({
  settings,
  onChange,
}: {
  settings: UserSettingsConfig;
  onChange: (settings: UserSettingsConfig) => void;
}) {
  return (
    <NumberField
      label="Sync Debounce Delay (ms)"
      placeholder="e.g. 300"
      value={settings.syncDebounceDelay}
      emptyValue={300}
      onChange={(syncDebounceDelay) => onChange({ ...settings, syncDebounceDelay })}
      size="sm"
      min={0}
      max={10000}
      step={50}
      maw={300}
    />
  );
});
