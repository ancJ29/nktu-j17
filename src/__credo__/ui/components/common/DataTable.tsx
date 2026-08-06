import React, { useCallback, useMemo, useRef } from 'react';

import { Box, Center, LoadingOverlay, ScrollArea, Table, Text } from '@mantine/core';

import { InfiniteScrollSentinel } from './InfiniteScrollSentinel';

export type DataTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  ta?: 'left' | 'center' | 'right';
  render?: (item: T) => React.ReactNode;
  accessor?: keyof T;
  width?: string | number;
  hidden?: boolean;

  onCellClick?: (item: T, event: React.MouseEvent) => void;
};

export type DataTableDensity = 'comfortable' | 'compact';

const COMPACT_FONT_SCALE = {
  '--mantine-font-size-sm': '0.8125rem',
  '--mantine-font-size-xs': '0.6875rem', // 12px → 11px
} as React.CSSProperties;

const SPACING: Record<
  DataTableDensity,
  { vertical: string | number; horizontal: string | number }
> = {
  comfortable: { vertical: 'sm', horizontal: 'xs' },
  compact: { vertical: 6, horizontal: 8 },
};

type DataTableProps<T> = {
  readonly withIndex?: boolean;
  readonly indexStart?: number;
  readonly data: T[];
  readonly columns: Array<DataTableColumn<T>>;
  readonly isLoading?: boolean;
  readonly emptyMessage?: string;
  readonly actionsHeader?: string;
  readonly noActions?: boolean;
  readonly renderActions?: (item: T) => React.ReactNode;
  readonly onRowClick?: (item: T) => void;
  readonly onActionCellClick?: (event: React.MouseEvent) => void;
  readonly getRowBg?: (item: T) => string | undefined;

  readonly maxHeight?: number | string;

  readonly stickyHeader?: boolean;

  readonly viewportRef?: React.Ref<HTMLDivElement>;

  readonly hasMore?: boolean;
  readonly onLoadMore?: () => void;
  readonly loadingMoreLabel?: string;

  readonly density?: DataTableDensity;
};

export function DataTable<T extends Record<string, unknown> & { id: string }>({
  withIndex = false,
  indexStart = 1,
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No data found',
  actionsHeader = '',
  noActions = false,
  renderActions,
  onRowClick,
  onActionCellClick,
  getRowBg,
  maxHeight,
  stickyHeader,
  viewportRef,
  hasMore = false,
  onLoadMore,
  loadingMoreLabel,
  density = 'comfortable',
}: DataTableProps<T>) {
  const visibleColumns = useMemo(() => columns.filter((column) => !column.hidden), [columns]);

  const showsActionsColumn = !noActions && Boolean(renderActions);
  const columnCount = visibleColumns.length + (withIndex ? 1 : 0) + (showsActionsColumn ? 1 : 0);
  const lazy = hasMore && Boolean(onLoadMore);

  const bounded = maxHeight != null;
  const sticky = stickyHeader ?? bounded;

  const localViewportRef = useRef<HTMLDivElement | null>(null);
  const setViewport = useCallback(
    (node: HTMLDivElement | null) => {
      localViewportRef.current = node;
      if (typeof viewportRef === 'function') viewportRef(node);
      else if (viewportRef) {
        (viewportRef as React.RefObject<HTMLDivElement | null>).current = node;
      }
    },
    [viewportRef],
  );

  const ScrollWrap = (bounded ? ScrollArea.Autosize : ScrollArea) as React.ElementType;
  const scrollProps = bounded
    ? { mah: maxHeight, type: 'auto' as const, viewportRef: setViewport }
    : { viewportRef: setViewport };

  return (
    <Box style={{ position: 'relative' }}>
      <LoadingOverlay
        visible={isLoading}
        overlayProps={{ blur: 2 }}
        transitionProps={{ duration: 300 }}
      />

      <ScrollWrap {...scrollProps}>
        <Table
          striped
          highlightOnHover
          verticalSpacing={SPACING[density].vertical}
          horizontalSpacing={SPACING[density].horizontal}
          stickyHeader={sticky}

          style={density === 'compact' ? COMPACT_FONT_SCALE : undefined}
        >
          <Table.Thead
            px="xs"

            style={sticky ? { backgroundColor: 'var(--mantine-color-body)' } : undefined}
          >
            <Table.Tr>
              {withIndex && <Table.Th w={40}>#</Table.Th>}
              {visibleColumns.map((column) => (
                <Table.Th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  ta={column.ta ? column.ta : undefined}
                >
                  {column.header}
                </Table.Th>
              ))}
              {!noActions && renderActions ? <Table.Th w={60}>{actionsHeader}</Table.Th> : null}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody px="xs">
            {data.map((item, index) => {
              const hasClickHandler = Boolean(onRowClick);

              const rowBg = getRowBg?.(item);

              return (
                <Table.Tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  style={hasClickHandler ? { cursor: 'pointer' } : undefined}
                  bg={rowBg}
                >
                  {withIndex && <Table.Td>{index + indexStart}</Table.Td>}
                  {visibleColumns.map((column) => (
                    <Table.Td
                      key={column.key}
                      style={column.width ? { width: column.width } : undefined}
                      onClick={
                        column.onCellClick ? (event) => column.onCellClick!(item, event) : undefined
                      }
                    >
                      {renderCellContent(item, column)}
                    </Table.Td>
                  ))}
                  {!noActions && renderActions ? (
                    <Table.Td onClick={onActionCellClick}>{renderActions(item)}</Table.Td>
                  ) : null}
                </Table.Tr>
              );
            })}
            {lazy && (
              <Table.Tr>
                <Table.Td colSpan={columnCount}>
                  <InfiniteScrollSentinel
                    hasMore={hasMore}
                    onLoadMore={onLoadMore!}
                    renderedCount={data.length}
                    label={loadingMoreLabel}

                    rootRef={bounded ? localViewportRef : undefined}
                  />
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollWrap>

      {data.length === 0 && !isLoading && (
        <Center py="xl" mih="30vh">
          <Text c="dimmed">{emptyMessage}</Text>
        </Center>
      )}
    </Box>
  );
}

function renderCellContent<T>(item: T, column: DataTableColumn<T>): string | React.ReactNode {
  if (column.render) {
    return column.render(item);
  }

  if (column.accessor) {
    const value = item[column.accessor];
    return (value || '-') as string;
  }

  return '-';
}
