import {
  ActionIcon,
  Alert,
  Box,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconBarcode, IconCheck, IconCopy } from '@tabler/icons-react';
import JsBarcode from 'jsbarcode';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  readonly value: string;

  readonly label?: string;
};

function pickFormat(raw: string): 'EAN13' | 'UPC' | 'EAN8' | 'CODE128' {
  if (/^\d{13}$/.test(raw)) return 'EAN13';
  if (/^\d{12}$/.test(raw)) return 'UPC';
  if (/^\d{8}$/.test(raw)) return 'EAN8';
  return 'CODE128';
}

const RENDER_OPTIONS = {
  width: 2,
  height: 72,
  margin: 8,
  displayValue: true,
  font: 'var(--mantine-font-family-monospace)',
  fontSize: 14,
  textMargin: 6,
  background: 'transparent',
} as const;

export function BarcodeDisplay({ value, label }: Props) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const clipboard = useClipboard({ timeout: 1500 });

  const trimmed = value.trim();
  const format = trimmed ? pickFormat(trimmed) : 'CODE128';

  const error = useMemo<string | null>(() => {
    if (!trimmed || typeof document === 'undefined') return null;
    try {
      const probe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(probe, trimmed, { ...RENDER_OPTIONS, format });
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid barcode';
    }
  }, [trimmed, format]);

  useEffect(() => {
    if (!svgRef.current || !trimmed || error) return;
    JsBarcode(svgRef.current, trimmed, { ...RENDER_OPTIONS, format });
  }, [trimmed, format, error]);

  if (!trimmed) return null;

  return (
    <Card withBorder radius="md" padding="md">
      <Group justify="space-between" wrap="nowrap" mb="xs">
        <Group gap={8}>
          <ThemeIcon size={24} radius="sm" variant="light" color="gray">
            <IconBarcode size={14} stroke={1.75} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            {label ?? t('common.labels.barcode')}
          </Text>
          <Text size="xs" c="dimmed">
            {format}
          </Text>
        </Group>
        <Tooltip
          label={clipboard.copied ? t('common.labels.copied') : t('__new__.01-common.actions.copy')}
          position="top"
          withArrow
        >
          <ActionIcon
            variant="subtle"
            size="sm"
            color={clipboard.copied ? 'teal' : 'gray'}
            onClick={() => clipboard.copy(trimmed)}
          >
            {clipboard.copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          </ActionIcon>
        </Tooltip>
      </Group>

      {error ? (
        <Alert color="orange" variant="light" title={t('products.barcode.invalid')}>
          <Stack gap={4}>
            <Text size="xs">{error}</Text>
            <Text size="xs" ff="monospace">
              {trimmed}
            </Text>
          </Stack>
        </Alert>
      ) : (
        <Box
          style={{
            background: 'var(--mantine-color-white)',
            padding: 8,
            borderRadius: 4,
            display: 'flex',
            justifyContent: 'center',

            overflow: 'hidden',
          }}
        >
          <svg ref={svgRef} />
        </Box>
      )}
    </Card>
  );
}
