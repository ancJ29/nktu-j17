import type { CMngtDisplaySettings } from '@credo/kits/types';
import { Select, SimpleGrid } from '@mantine/core';
import { memo } from 'react';

const DATE_FORMAT_OPTIONS: CMngtDisplaySettings['dateFormat'][] = [
  'DD/MM/YYYY',
  'YYYY/MM/DD',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
];

const DATE_TIME_FORMAT_OPTIONS: CMngtDisplaySettings['dateTimeFormat'][] = [
  'HH:mm DD/MM/YYYY',
  'DD/MM/YYYY HH:mm',
  'HH:mm YYYY/MM/DD',
  'YYYY/MM/DD HH:mm',
  'HH:mm DD-MM-YYYY',
  'DD-MM-YYYY HH:mm',
  'HH:mm YYYY-MM-DD',
  'YYYY-MM-DD HH:mm',
];

export const DisplaySettingsSection = memo(function DisplaySettingsSection({
  settings,
  tableDensity,
  onChange,
  onTableDensityChange,
}: {
  settings: CMngtDisplaySettings;
  tableDensity: 'comfortable' | 'compact';
  onChange: (s: CMngtDisplaySettings) => void;
  onTableDensityChange: (d: 'comfortable' | 'compact') => void;
}) {
  const now = new Date();
  const preview = (fmt: string) => {
    const p = {
      YYYY: now.getFullYear().toString(),
      MM: (now.getMonth() + 1).toString().padStart(2, '0'),
      DD: now.getDate().toString().padStart(2, '0'),
      HH: now.getHours().toString().padStart(2, '0'),
      mm: now.getMinutes().toString().padStart(2, '0'),
    };
    return fmt
      .replace('YYYY', p.YYYY)
      .replace('MM', p.MM)
      .replace('DD', p.DD)
      .replace('HH', p.HH)
      .replace('mm', p.mm);
  };

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      <Select
        label="Date Format"
        description="How dates are displayed across the application"
        value={settings.dateFormat}
        onChange={(v) =>
          onChange({
            ...settings,
            dateFormat: (v as CMngtDisplaySettings['dateFormat']) ?? 'DD/MM/YYYY',
          })
        }
        data={DATE_FORMAT_OPTIONS.map((f) => ({ value: f, label: `${f}  →  ${preview(f)}` }))}
        size="sm"
      />
      <Select
        label="Date & Time Format"
        description="How date-time values are displayed across the application"
        value={settings.dateTimeFormat}
        onChange={(v) =>
          onChange({
            ...settings,
            dateTimeFormat: (v as CMngtDisplaySettings['dateTimeFormat']) ?? 'HH:mm DD/MM/YYYY',
          })
        }
        data={DATE_TIME_FORMAT_OPTIONS.map((f) => ({ value: f, label: `${f}  →  ${preview(f)}` }))}
        size="sm"
      />
      <Select
        label="Table Density"
        description="Row height and text size on every list table. Compact fits roughly a third more rows on a screen."
        value={tableDensity}
        onChange={(v) => onTableDensityChange(v === 'compact' ? 'compact' : 'comfortable')}
        data={[
          { value: 'comfortable', label: 'Comfortable  →  default spacing' },
          { value: 'compact', label: 'Compact  →  tighter rows, smaller text' },
        ]}
        size="sm"
      />
    </SimpleGrid>
  );
});
