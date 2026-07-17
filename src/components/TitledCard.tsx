import React from 'react';
import { Card, type MantineSpacing } from '@mantine/core';
import { FieldLabel } from '@credo/base-ui/components';

/**
 * Card with a gray banded title header. V1-era detail-page pattern — the V2
 * design system uses `SectionCard` (icon-led, no band) instead. Kept for pages
 * that haven't migrated yet (Sales Order detail).
 */
type TitledCardProps = {
  title: string;
  children: React.ReactNode;
  p?: MantineSpacing;
};

export function TitledCard({ title, children, p = 'sm' }: TitledCardProps) {
  return (
    <Card withBorder padding={p}>
      <Card.Section withBorder inheritPadding py="sm" bg="gray.0">
        <FieldLabel fw={700} lts={0.5}>
          {title}
        </FieldLabel>
      </Card.Section>
      {children}
    </Card>
  );
}
