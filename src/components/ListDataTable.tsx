import type { Ref } from 'react';
import { useNavigate } from 'react-router';
import { DataTable, type DataTableColumn } from '@credo/base-ui/components';

type Row = { id: string };

type ListDataTableProps<T extends Row> = {
  readonly data: T[];
  readonly columns: Array<DataTableColumn<T>>;
  readonly isLoading?: boolean;
  readonly emptyMessage?: string;
  readonly detailRoute?: string;
  readonly onRowClick?: (item: T) => void;
  readonly withIndex?: boolean;
  readonly getRowBg?: (item: T) => string | undefined;
  
  readonly maxHeight?: number | string;
  
  readonly viewportRef?: Ref<HTMLDivElement>;
};

export function ListDataTable<T extends Row>({
  data,
  columns,
  isLoading,
  emptyMessage,
  detailRoute,
  onRowClick,
  withIndex = true,
  getRowBg,
  maxHeight = 'calc(100vh - 300px)',
  viewportRef,
}: ListDataTableProps<T>) {
  const navigate = useNavigate();

  const handleRowClick =
    onRowClick ??
    (detailRoute
      ? (item: T) => {
          navigate(detailRoute.replace(':id', item.id));
        }
      : undefined);

  return (
    <DataTable
      withIndex={withIndex}
      noActions
      maxHeight={maxHeight}
      viewportRef={viewportRef}
      data={data as (T & Record<string, unknown>)[]}
      columns={columns as Array<DataTableColumn<T & Record<string, unknown>>>}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      onRowClick={handleRowClick as ((item: T & Record<string, unknown>) => void) | undefined}
      getRowBg={getRowBg as ((item: T & Record<string, unknown>) => string | undefined) | undefined}
    />
  );
}
