import * as XLSX from 'xlsx-js-style';

import { downloadBlob } from '@/utils/pdfExport';

import { resolvePermissions } from '@credo/modules/permissions';

import {
  BASE_PERMISSIONS,
  CRUD_KEYS,
  type ModulePermissions,
  type PartialPermissions,
  type Permissions,
} from '@/types/permissions';

export type PermissionsExportEmployee = {
  name: string;
  department?: string;
  isActive: boolean;
  extra?: { permissions?: PartialPermissions; isDeleted?: boolean } | null;
};

export type PermissionsExportOptions = {
  clientPermissions?: PartialPermissions | null;

  departmentOptions: ReadonlyArray<{ value: string; permissions?: PartialPermissions | null }>;

  departmentLabel: (value: string | undefined) => string;
  labels: {
    sheetName: string;
    module: string;
    permission: string;
    department: string;
    status: string;
    active: string;
    inactive: string;
    moduleName: (moduleKey: string) => string;
    crud: (key: (typeof CRUD_KEYS)[number]) => string;
    flag: (key: string) => string;
  };
};

export const PERMISSION_TICK = '✓';

function hasAnyGranted(mod: ModulePermissions | undefined): boolean {
  if (!mod) return false;
  if (CRUD_KEYS.some((k: (typeof CRUD_KEYS)[number]) => mod[k])) return true;
  return (
    Object.values(mod.actions ?? {}).some(Boolean) || Object.values(mod.query ?? {}).some(Boolean)
  );
}

type FlagRow = {
  moduleKey: string;
  label: string;
  read: (perms: Permissions) => boolean;
};

export function buildEmployeePermissionsRows(
  employees: ReadonlyArray<PermissionsExportEmployee>,
  { clientPermissions, departmentOptions, departmentLabel, labels }: PermissionsExportOptions,
): (string | number)[][] {
  const people = employees.filter((e) => !e.extra?.isDeleted);
  const clientResolved = resolvePermissions({
    base: BASE_PERMISSIONS,
    client: clientPermissions,
  });

  const flagRows: FlagRow[] = [];
  for (const moduleKey of Object.keys(BASE_PERMISSIONS)) {
    if (!hasAnyGranted(clientResolved[moduleKey])) continue;
    const base = BASE_PERMISSIONS[moduleKey];
    for (const key of CRUD_KEYS) {
      flagRows.push({
        moduleKey,
        label: labels.crud(key),
        read: (p) => p[moduleKey]?.[key] === true,
      });
    }
    for (const group of ['actions', 'query'] as const) {
      for (const key of Object.keys(base[group] ?? {})) {
        flagRows.push({
          moduleKey,
          label: labels.flag(key),
          read: (p) => p[moduleKey]?.[group]?.[key] === true,
        });
      }
    }
  }

  const resolved = people.map((e) =>
    resolvePermissions({
      base: BASE_PERMISSIONS,
      client: clientPermissions,
      department: departmentOptions.find((d) => d.value === e.department)?.permissions,
      employee: e.extra?.permissions,
    }),
  );

  const rows: (string | number)[][] = [
    [labels.module, labels.permission, ...people.map((e) => e.name)],
    ['', labels.department, ...people.map((e) => departmentLabel(e.department))],
    ['', labels.status, ...people.map((e) => (e.isActive ? labels.active : labels.inactive))],
  ];
  let lastModule = '';
  for (const row of flagRows) {
    const moduleCell = row.moduleKey === lastModule ? '' : labels.moduleName(row.moduleKey);
    lastModule = row.moduleKey;
    rows.push([
      moduleCell,
      row.label,
      ...resolved.map((p) => (row.read(p) ? PERMISSION_TICK : '')),
    ]);
  }
  return rows;
}

const UNFROZEN_VIEW = '<sheetView workbookViewId="0"/>';
const FROZEN_VIEW =
  '<sheetView workbookViewId="0"><pane xSplit="2" ySplit="3" topLeftCell="C4" activePane="bottomRight" state="frozen"/>' +
  '<selection pane="bottomRight" activeCell="C4" sqref="C4"/></sheetView>';

export function buildEmployeePermissionsWorkbook(
  employees: ReadonlyArray<PermissionsExportEmployee>,
  options: PermissionsExportOptions,
): Uint8Array {
  const rows = buildEmployeePermissionsRows(employees, options);
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ width: 22 }, { width: 30 }, ...rows[0].slice(2).map(() => ({ width: 18 }))];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, options.labels.sheetName);

  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const cfb = XLSX.CFB.read(new Uint8Array(bytes), { type: 'array' });

  const entry =
    cfb.FileIndex[cfb.FullPaths.findIndex((p: string) => p.endsWith('xl/worksheets/sheet1.xml'))];
  const xml = entry ? new TextDecoder().decode(entry.content as Uint8Array) : '';
  if (!xml.includes(UNFROZEN_VIEW)) throw new Error('permissions export: sheet view not found');
  const patched = new TextEncoder().encode(xml.replace(UNFROZEN_VIEW, FROZEN_VIEW));
  entry.content = patched;
  entry.size = patched.length;
  return new Uint8Array(XLSX.CFB.write(cfb, { fileType: 'zip', type: 'array', compression: true }));
}

export const exportEmployeePermissionsToExcel = (
  employees: ReadonlyArray<PermissionsExportEmployee>,
  options: PermissionsExportOptions,
) => {
  const bytes = buildEmployeePermissionsWorkbook(employees, options);
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  downloadBlob(
    new Blob([bytes as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `employee_permissions_${now.getFullYear()}-${mm}-${dd}.xlsx`,
  );
};
