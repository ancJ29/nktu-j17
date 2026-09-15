export type PickableRow = {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly extra?: { readonly isDeleted?: boolean } | undefined;
};

export type PickerOption = { value: string; label: string };

export const isLiveRow = (row: PickableRow): boolean =>
  row.isActive && row.extra?.isDeleted !== true;

export function pickerOptions<Row extends PickableRow>(
  rows: readonly Row[],
  keepIds: ReadonlySet<string>,
  inactiveSuffix: string,
  valueOf: (row: Row) => string = (row) => row.id,
): PickerOption[] {
  return rows.flatMap((row) => {
    const live = isLiveRow(row);
    if (!live && !keepIds.has(row.id)) return [];
    const label = `${row.code} — ${row.name}`;
    return [{ value: valueOf(row), label: live ? label : `${label} ${inactiveSuffix}` }];
  });
}
