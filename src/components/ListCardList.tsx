import { Fragment, type ReactNode } from 'react';
import { Card, Skeleton, Stack, Text } from '@mantine/core';
import { useNavigate } from 'react-router';

type Row = { id: string };

type ListCardListProps<T extends Row> = {
  readonly data: T[];
  readonly isLoading?: boolean;
  readonly emptyMessage?: string;
  readonly emptyState?: ReactNode;
  readonly renderCard: (item: T) => ReactNode;
  readonly renderSkeleton?: () => ReactNode;
  readonly skeletonLines?: number;
  readonly detailRoute?: string;
  readonly onRowClick?: (item: T) => void;
  readonly getRowBg?: (item: T) => string | undefined;
};

function DefaultSkeleton({ lines }: { lines: number }) {
  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap={6}>
        <Skeleton h={14} w="60%" />
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} h={10} w={`${40 + ((i * 10) % 30)}%`} />
        ))}
      </Stack>
    </Card>
  );
}

export function ListCardList<T extends Row>({
  data,
  isLoading,
  emptyMessage,
  emptyState,
  renderCard,
  renderSkeleton,
  skeletonLines = 2,
  detailRoute,
  onRowClick,
  getRowBg,
}: ListCardListProps<T>) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }, (_, i) => (
          <Fragment key={i}>
            {renderSkeleton ? renderSkeleton() : <DefaultSkeleton lines={skeletonLines} />}
          </Fragment>
        ))}
      </Stack>
    );
  }

  if (data.length === 0) {
    return (
      <>
        {emptyState ?? (
          <Text c="dimmed" ta="center" py="xl" size="sm">
            {emptyMessage}
          </Text>
        )}
      </>
    );
  }

  const handleClick =
    onRowClick ??
    (detailRoute ? (item: T) => navigate(detailRoute.replace(':id', item.id)) : undefined);

  return (
    <Stack gap="sm">
      {data.map((item) => (
        <Card
          key={item.id}
          withBorder
          padding="sm"
          radius="md"
          onClick={handleClick ? () => handleClick(item) : undefined}
          bg={getRowBg?.(item)}
          style={{ cursor: handleClick ? 'pointer' : undefined }}
        >
          {renderCard(item)}
        </Card>
      ))}
    </Stack>
  );
}
