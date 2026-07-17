import { Group, Pagination, Select } from '@mantine/core';

import './ListPagination.css';

const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];
const DEFAULT_PAGE_SIZE = 20;

type ListPaginationProps = {
  readonly page: number;
  readonly totalPages: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (size: number) => void;
};

export { DEFAULT_PAGE_SIZE };

export function ListPagination({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ListPaginationProps) {
  if (totalPages <= 1 && pageSize === DEFAULT_PAGE_SIZE) return null;

  return (
    <Group className="credo-list-pagination" justify="space-between" gap="lg">
      <Select
        className="credo-list-pagination-select"
        value={String(pageSize)}
        onChange={(v) => v && onPageSizeChange(Number(v))}
        data={PAGE_SIZE_OPTIONS}
        size="xs"
        w={80}
        allowDeselect={false}
        aria-label="Items per page"
      />
      {totalPages > 1 && (
        <Pagination value={page} onChange={onPageChange} total={totalPages} size="sm" />
      )}
    </Group>
  );
}
