

import { useCallback, useRef, useState } from 'react';
import { Alert, Badge, Button, FileButton, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconDownload, IconUpload } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { logger } from '@credo/base-ui/utils';
import { logActivity } from '@/utils/activityLogger';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { getCurrentPeriodKey } from '@/utils/inventoryPeriod';
import {
  ExcelParseError,
  exportInventoryToExcel,
  parseInventoryExcelFile,
  reconcileInventoryRows,
  type InventoryExportRow,
  type ParsedInventoryRow,
  type ReconciledInventoryRow,
} from '@/utils/inventoryExcel';

type ExistingRow = Omit<InventoryExportRow, 'extra'> & {
  readonly id: string;
  readonly version: string;
  
  readonly extra?: {
    readonly unit?: string;
    readonly beginOfPeriod?: Readonly<Record<string, number>>;
    readonly [key: string]: unknown;
  };
};

type MasterItem = {
  readonly id: string;
  readonly code: string; 
  readonly name: string;
  readonly unit: string;
  readonly isActive: boolean;
  readonly extra?: {
    readonly sku?: string;
    readonly units?: string[];
    readonly isDeleted?: boolean;
  };
};

type Props = {
  readonly entityType: 'product' | 'material';
  
  readonly rows: ReadonlyArray<ExistingRow>;
  
  readonly items: ReadonlyArray<MasterItem>;
  
  readonly canImport: boolean;
  readonly canExport: boolean;
  
  readonly onAfterImport: () => Promise<void> | void;
};

type ParseResult = {
  readonly file: File;
  readonly parsed: ParsedInventoryRow[];
  readonly matched: ReconciledInventoryRow[];
  readonly unmatched: ParsedInventoryRow[];
};

export function InventoryImportExportActions({
  entityType,
  rows,
  items,
  canImport,
  canExport,
  onAfterImport,
}: Props) {
  const { t, i18n } = useTranslation();
  const ns = entityType === 'product' ? 'productInventory' : 'materialInventory';

  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  
  
  const fileButtonResetRef = useRef<() => void>(null);

  const handleExport = useCallback(() => {
    
    
    const activeItemCount = items.filter((it) => it.isActive && !it.extra?.isDeleted).length;
    if (activeItemCount === 0) {
      notifications.show({
        color: 'yellow',
        message: t(`${ns}.notifications.exportEmpty`),
      });
      return;
    }
    try {
      exportInventoryToExcel(rows, items, {
        language: i18n.language,
        entityType,
      });
      notifications.show({
        color: 'green',
        message: t(`${ns}.notifications.exportSuccess`, { count: activeItemCount }),
      });
    } catch (err) {
      logger.error('Inventory export failed:', err);
      notifications.show({
        color: 'red',
        message: t(`${ns}.notifications.exportError`),
      });
    }
  }, [rows, items, entityType, i18n.language, t, ns]);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const parsed = await parseInventoryExcelFile(file);
        if (parsed.length === 0) {
          notifications.show({
            color: 'yellow',
            message: t(`${ns}.notifications.importNoValid`),
          });
          fileButtonResetRef.current?.();
          return;
        }
        const { matched, unmatched } = reconcileInventoryRows(parsed, items);
        if (matched.length === 0) {
          notifications.show({
            color: 'red',
            title: t(`${ns}.notifications.importNoMatchedTitle`),
            message: t(`${ns}.notifications.importNoMatched`, { count: unmatched.length }),
            autoClose: 8000,
          });
          fileButtonResetRef.current?.();
          return;
        }
        setParseResult({ file, parsed, matched, unmatched });
      } catch (err) {
        if (err instanceof ExcelParseError) {
          if (err.missing.includes('identity')) {
            notifications.show({
              color: 'red',
              title: t(`${ns}.notifications.importMissingColumnTitle`),
              message: t(`${ns}.notifications.importNoIdentity`),
              autoClose: 8000,
            });
          } else {
            notifications.show({
              color: 'red',
              title: t(`${ns}.notifications.importMissingColumnTitle`),
              message: t(`${ns}.notifications.importMissingColumn`, {
                columns: err.missing.join(', '),
              }),
              autoClose: 8000,
            });
          }
        } else {
          logger.error('Inventory import parse failed:', err);
          notifications.show({
            color: 'red',
            message: t(`${ns}.notifications.importParseError`),
          });
        }
        fileButtonResetRef.current?.();
      }
    },
    [items, t, ns],
  );

  const closeModal = useCallback(() => {
    if (isImporting) return;
    setParseResult(null);
    fileButtonResetRef.current?.();
  }, [isImporting]);

  const handleConfirmImport = useCallback(async () => {
    if (!parseResult) return;
    setIsImporting(true);
    try {
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      const periodKey = getCurrentPeriodKey();
      const existingExtraByPair = new Map<string, ExistingRow['extra']>();
      for (const row of rows) {
        if (row.extra) {
          existingExtraByPair.set(`${row.itemCode}::${row.locationCode}`, row.extra);
        }
      }
      const payload = parseResult.matched.map((r) => {
        const existingExtra = existingExtraByPair.get(`${r.itemCode}::${r.locationCode}`);
        const mergedExtra: Record<string, unknown> = { ...(existingExtra ?? {}) };
        if (r.unit) {
          mergedExtra.unit = r.unit;
          mergedExtra.onHandByUnit = { [r.unit]: r.onHand };
        }
        if (r.beginOfPeriod !== undefined) {
          mergedExtra.beginOfPeriod = {
            ...(existingExtra?.beginOfPeriod ?? {}),
            [periodKey]: r.beginOfPeriod,
          };
        }
        return {
          itemCode: r.itemCode,
          locationCode: r.locationCode,
          onHand: r.onHand,
          extra: mergedExtra,
        };
      });
      const res = await useProductInventoryStore.getState().bulkUpsertSafely({ items: payload });
      const created = res.summary?.created ?? 0;
      const updated = res.summary?.updated ?? 0;
      const failed = res.summary?.errors ?? 0;
      const total = res.summary?.total ?? payload.length;

      
      
      
      
      
      
      
      
      const idByItemCode = new Map(items.map((it) => [it.code, it.id]));
      for (const row of [...res.created, ...res.updated]) {
        const targetId = idByItemCode.get(row.itemCode);
        if (!targetId) continue;
        logActivity(`${ns}.import`, targetId, {
          locationCode: row.locationCode,
          onHand: row.onHand,
        });
      }

      
      
      
      
      await onAfterImport();

      if (failed === 0) {
        notifications.show({
          color: 'green',
          message: t(`${ns}.notifications.importSuccess`, {
            created,
            updated,
          }),
        });
      } else {
        
        const errorPreview = (res.errors ?? [])
          .slice(0, 3)
          .map((e) => `#${e.index + 1}: ${e.message}`)
          .join('; ');
        notifications.show({
          color: 'yellow',
          title: t(`${ns}.notifications.importPartialTitle`),
          message: `${t(`${ns}.notifications.importPartial`, {
            created,
            updated,
            total,
            failed,
          })}${errorPreview ? ` — ${errorPreview}` : ''}`,
          autoClose: 12000,
        });
      }
      setParseResult(null);
      fileButtonResetRef.current?.();
    } catch (err) {
      logger.error('Inventory import failed:', err);
      notifications.show({
        color: 'red',
        message: t(`${ns}.notifications.importError`),
      });
    } finally {
      setIsImporting(false);
    }
  }, [parseResult, onAfterImport, t, ns, rows, items]);

  return (
    <>
      <Group gap="xs" wrap="nowrap">
        {canExport && (
          <Button
            variant="default"
            size="sm"
            leftSection={<IconDownload size={16} />}
            onClick={handleExport}
            disabled={rows.length === 0 && items.length === 0}
          >
            {t('__new__.01-common.actions.exportExcel')}
          </Button>
        )}
        {canImport && (
          <FileButton onChange={handleFile} accept=".xlsx,.xls,.csv" resetRef={fileButtonResetRef}>
            {(props) => (
              <Button {...props} variant="default" size="sm" leftSection={<IconUpload size={16} />}>
                {t(`${ns}.importButton`)}
              </Button>
            )}
          </FileButton>
        )}
      </Group>

      <ResponsiveModal
        opened={!!parseResult}
        onClose={closeModal}
        title={t(`${ns}.importModal.title`)}
        size="lg"
      >
        {parseResult && (
          <Stack gap="md">
            <Text size="sm">
              {t(`${ns}.importModal.fileSummary`, {
                filename: parseResult.file.name,
                parsed: parseResult.parsed.length,
              })}
            </Text>
            <Group gap="xs" wrap="wrap">
              <Badge color="green" variant="light">
                {t(`${ns}.importModal.matched`, { count: parseResult.matched.length })}
              </Badge>
              {parseResult.unmatched.length > 0 && (
                <Badge color="yellow" variant="light">
                  {t(`${ns}.importModal.unmatched`, { count: parseResult.unmatched.length })}
                </Badge>
              )}
              <Badge color="gray" variant="light">
                {t(`${ns}.importModal.existing`, { count: rows.length })}
              </Badge>
            </Group>
            <Alert
              icon={<IconAlertTriangle size={16} />}
              color="orange"
              variant="light"
              radius="md"
              title={t(`${ns}.importModal.warningTitle`)}
            >
              {t(`${ns}.importModal.warningBody`, {
                existing: rows.length,
                matched: parseResult.matched.length,
              })}
            </Alert>
            {parseResult.unmatched.length > 0 && (
              <Text size="xs" c="dimmed">
                {t(`${ns}.importModal.unmatchedHint`, {
                  skus: parseResult.unmatched
                    .slice(0, 5)
                    .map((r) => r.sku || r.itemCode || `#${r.rowNumber}`)
                    .join(', '),
                  more:
                    parseResult.unmatched.length > 5
                      ? ` (+${parseResult.unmatched.length - 5})`
                      : '',
                })}
              </Text>
            )}
            <Group justify="flex-end" gap="sm">
              <Button variant="default" size="sm" onClick={closeModal} disabled={isImporting}>
                {t('__new__.01-common.actions.cancel')}
              </Button>
              <Button color="orange" size="sm" loading={isImporting} onClick={handleConfirmImport}>
                {t(`${ns}.importModal.confirm`)}
              </Button>
            </Group>
          </Stack>
        )}
      </ResponsiveModal>
    </>
  );
}
