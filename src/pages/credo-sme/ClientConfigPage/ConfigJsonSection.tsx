import { Alert, Badge, Button, Code, Divider, Group, Stack, Text, Textarea } from '@mantine/core';
import { IconFileImport } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { CredoAppConfigSchema, type CredoAppConfig } from '../schema';

type PastedState =
  | { kind: 'empty' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'valid'; config: CredoAppConfig; dropped: string[] };

export function ConfigJsonSection({
  config,
  stored,
  onApply,
}: {
  config: CredoAppConfig | null;

  stored: CredoAppConfig | null;
  onApply: (config: CredoAppConfig) => void;
}) {
  const [text, setText] = useState('');

  const json = useMemo(() => (config ? JSON.stringify(config, null, 2) : ''), [config]);

  const pasted = useMemo<PastedState>(() => {
    if (!text.trim()) return { kind: 'empty' };

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (err) {
      return { kind: 'invalid', reason: err instanceof Error ? err.message : 'Not valid JSON' };
    }

    const parsed = CredoAppConfigSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        kind: 'invalid',
        reason: parsed.error.issues
          .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
          .join('; '),
      };
    }

    const incoming = new Set(Object.keys(parsed.data));
    const dropped = Object.keys(stored ?? {})
      .filter((key) => !incoming.has(key))
      .sort();

    return { kind: 'valid', config: parsed.data, dropped };
  }, [text, stored]);

  return (
    <Stack gap="sm">
      <Code block style={{ maxHeight: 100, overflow: 'auto' }}>
        {json}
      </Code>

      <Divider label="Replace from JSON" labelPosition="left" />

      <Textarea
        label="Paste a config"
        description="Applied to the editor, not saved — review, then Save config."
        placeholder="{ … }"
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        autosize
        minRows={4}
        maxRows={7}
        spellCheck={false}
        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 12 } }}
      />

      {pasted.kind === 'invalid' && (
        <Alert color="red" variant="light" title="Not applied">
          {pasted.reason}
        </Alert>
      )}

      {pasted.kind === 'valid' && pasted.dropped.length > 0 && (
        <Alert
          color="red"
          variant="light"
          title={`${pasted.dropped.length} section(s) would be deleted`}
        >
          <Stack gap="xs">
            <Text size="xs">
              The stored config has these and your JSON does not. Applying and saving removes them
              from this client.
            </Text>
            <Group gap="xs">
              {pasted.dropped.map((key) => (
                <Badge key={key} size="sm" color="red" variant="light">
                  {key}
                </Badge>
              ))}
            </Group>
          </Stack>
        </Alert>
      )}

      <Group justify="flex-end">
        <Button
          size="sm"
          variant="light"
          leftSection={<IconFileImport size={16} />}
          disabled={pasted.kind !== 'valid'}
          onClick={() => {
            if (pasted.kind !== 'valid') return;
            onApply(pasted.config);
            setText('');
          }}
        >
          Apply to editor
        </Button>
      </Group>
    </Stack>
  );
}
