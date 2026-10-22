import { useCallback, useState } from 'react';
import { ActionIcon, Group, Text, type TextProps } from '@mantine/core';
import { IconCheck, IconCopy, IconPhone } from '@tabler/icons-react';
import { device } from '../../utils/device';
import { formatPhoneNumber } from '@credo/kits/formatted';
import { Tooltip } from '../common/Tooltip';

type PhoneNumberProps = {
  readonly value: string;

  readonly copyTooltip: string;

  readonly copiedTooltip: string;
} & Omit<TextProps, 'children'>;

export function PhoneNumber({ value, copyTooltip, copiedTooltip, ...textProps }: PhoneNumberProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!value) return;
      navigator.clipboard.writeText(value).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    },
    [value],
  );

  if (!value) {
    return (
      <Text size="sm" c="dimmed" {...textProps} style={{ userSelect: 'none' }}>
        {'-'}
      </Text>
    );
  }

  return (
    <Group gap={4} wrap="nowrap">
      {device.isMobile ? (
        <Text
          onClick={(e) => {
            e.stopPropagation();
          }}
          component="a"
          href={`tel:${value}`}
          style={{ userSelect: 'none', textDecoration: 'none', color: 'inherit' }}
          {...textProps}
        >
          {formatPhoneNumber(value) ?? value}
        </Text>
      ) : (
        <Text style={{ userSelect: 'none' }} {...textProps}>
          {formatPhoneNumber(value) ?? value}
        </Text>
      )}

      {device.isMobile ? (
        <ActionIcon component="a" href={`tel:${value}`} variant="subtle" color="gray" size="xs">
          <IconPhone size={14} />
        </ActionIcon>
      ) : (
        <Tooltip label={copied ? copiedTooltip : copyTooltip} withArrow>
          <ActionIcon
            variant="subtle"
            color={copied ? 'green' : 'gray'}
            size="xs"
            onClick={handleCopy}
          >
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}
