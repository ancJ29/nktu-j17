import React, { useEffect, useRef } from 'react';

import { Center, Group, Loader, Text } from '@mantine/core';

type InfiniteScrollSentinelProps = {
  readonly hasMore: boolean;

  readonly onLoadMore: () => void;

  readonly renderedCount: number;
  readonly label?: string;

  readonly rootRef?: React.RefObject<HTMLElement | null>;
};

export function InfiniteScrollSentinel({
  hasMore,
  onLoadMore,
  renderedCount,
  label,
  rootRef,
}: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMoreRef.current();
      },

      { root: rootRef?.current ?? null, rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, renderedCount, rootRef]);

  if (!hasMore) return null;

  return (
    <Center ref={ref} py="sm">
      <Group gap="xs" wrap="nowrap">
        <Loader size="xs" />
        {label && (
          <Text size="xs" c="dimmed">
            {label}
          </Text>
        )}
      </Group>
    </Center>
  );
}
