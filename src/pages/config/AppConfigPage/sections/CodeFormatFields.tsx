import { NumberInput, Paper, SimpleGrid, Text, TextInput } from '@mantine/core';
import { memo } from 'react';
import { buildEmployeeCodePreview } from '../helpers';

export const CodeFormatFields = memo(function CodeFormatFields({
  title,
  noun,
  codePrefix,
  codePadLength,
  placeholder,
  onPrefixChange,
  onPadLengthChange,
}: {
  title: string;

  noun: string;
  codePrefix: string;
  codePadLength: number;
  placeholder: string;
  onPrefixChange: (value: string) => void;
  onPadLengthChange: (value: number) => void;
}) {
  return (
    <Paper p="xs" withBorder>
      <Text fz="sm" fw={600} mb={4}>
        {title}
      </Text>
      <Text fz="xs" c="dimmed" mb="xs">
        {`Auto-generated codes for new ${noun}. Preview: ${buildEmployeeCodePreview(
          codePrefix,
          codePadLength,
          1,
        )}`}
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput
          label="Code Prefix"
          value={codePrefix}
          onChange={(e) => onPrefixChange(e.currentTarget.value)}
          size="sm"
          placeholder={placeholder}
        />
        <NumberInput
          label="Number Padding"
          value={codePadLength}
          onChange={(v) => onPadLengthChange(typeof v === 'number' ? v : 0)}
          size="sm"
          min={0}
          max={12}
        />
      </SimpleGrid>
    </Paper>
  );
});
