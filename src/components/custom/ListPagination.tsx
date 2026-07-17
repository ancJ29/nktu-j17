import { ListPagination as BaseListPagination } from '@credo/base-ui/components';
import { LIST_PAGINATION_DEFAULT } from '@/config/listDefaults';

type ListPaginationProps = {
  readonly shouldPagination?: boolean;
  readonly page: number;
  readonly totalPages: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (size: number) => void;
};

const defaultShouldPagination = LIST_PAGINATION_DEFAULT;

export function ListPagination({
  shouldPagination,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ListPaginationProps) {
  if (shouldPagination ?? defaultShouldPagination) {
    return (
      <BaseListPagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );
  }
  return null;
}
