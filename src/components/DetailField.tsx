import React from 'react';
import { Stack, Text } from '@mantine/core';
import { FieldLabel } from '@credo/base-ui/components';

type DetailFieldProps = {
  label: string;
  children: React.ReactNode;
};

export function DetailField({ label, children }: DetailFieldProps) {
  return (
    <Stack gap={2}>
      <FieldLabel>{label}</FieldLabel>
      <Text size="sm" fw={500} component="div">
        {children || '-'}
      </Text>
    </Stack>
  );
}
