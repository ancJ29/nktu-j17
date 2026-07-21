import { Button, Group, Select } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconFileSpreadsheet } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cMngtConnector } from '@credo/connectors/connector';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { perms } from '@/utils/permission';
import { exportFleetRefuelLogsToExcel, type RefuelExportEntry } from '@/utils/excelParser';
import type { OperationLog, OperationLogExtra, TruckAssetRow } from '@/types';
import { TruckListShell } from './shared/TruckListShell';

const CURRENT_YEAR = new Date().getFullYear();

const canExport = perms.truck.canExport();

function FleetRefuelExport() {
  const { t, i18n } = useTranslation();
  const items = useTruckAssetStore((s) => s.items);
  const trucks = useMemo(
    () => (items as TruckAssetRow[]).filter((a) => !a.extra?.isDeleted),
    [items],
  );

  const [month, setMonth] = useState('all');
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [exporting, setExporting] = useState(false);

  const monthOptions = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { month: 'long' });
    const months = Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1),
      label: fmt.format(new Date(2020, i, 1)),
    }));
    return [{ value: 'all', label: t('operationLogs.allMonths') }, ...months];
  }, [i18n.language, t]);

  const yearOptions = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i)).map((y) => ({
        value: y,
        label: y,
      })),
    [],
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      
      
      const entries: RefuelExportEntry[] = [];
      for (const truck of trucks) {
        const res = await cMngtConnector.getOperationLogsByTarget<OperationLogExtra>({
          targetId: truck.id,
          period: year,
        });
        const label = truck.extra?.plateNumber || truck.code;
        for (const log of res.operationLogs as OperationLog[]) {
          if (log.logType !== 'refuel') continue;
          if (month !== 'all' && Number(String(log.logDate).slice(5, 7)) !== Number(month))
            continue;
          entries.push({ vehicleLabel: label, log });
        }
      }
      if (entries.length === 0) {
        notifications.show({ color: 'yellow', message: t('assets.truck.fleetExport.empty') });
        return;
      }
      const monthLabel =
        month === 'all' ? undefined : monthOptions.find((o) => o.value === month)?.label;
      const periodLabel = monthLabel ? `${monthLabel} ${year}` : year;
      const fileTag = month === 'all' ? year : `${year}-${month.padStart(2, '0')}`;
      exportFleetRefuelLogsToExcel(entries, { language: i18n.language, periodLabel, fileTag });
    } catch {
      notifications.show({ color: 'red', message: t('assets.truck.fleetExport.error') });
    } finally {
      setExporting(false);
    }
  }, [trucks, year, month, monthOptions, i18n.language, t]);

  return (
    <Group gap="xs" wrap="nowrap">
      <Select
        size="xs"
        w={130}
        data={monthOptions}
        value={month}
        onChange={(v) => setMonth(v ?? 'all')}
        allowDeselect={false}
      />
      <Select
        size="xs"
        w={90}
        data={yearOptions}
        value={year}
        onChange={(v) => setYear(v ?? String(CURRENT_YEAR))}
        allowDeselect={false}
      />
      <Button
        size="compact-sm"
        variant="default"
        leftSection={<IconFileSpreadsheet size={14} />}
        loading={exporting}
        onClick={handleExport}
      >
        {t('assets.truck.fleetExport.button')}
      </Button>
    </Group>
  );
}

export function TruckAssetListPage() {
  return <TruckListShell headerExtraActions={canExport ? <FleetRefuelExport /> : undefined} />;
}
