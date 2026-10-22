import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  ColorSwatch,
  Group,
  Modal,
  Radio,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { StatusTransitionMatrixEditor } from '@/pages/config/AppConfigPage/editors/StatusTransitionMatrixEditor';
import { defaultStatusFlowDraftOf, type StatusFlowDraftOf } from './statusFlowDraft';
import type { StatusCapability, StatusFlowConfig } from '@credo/connectors/status-flow';

const PALETTE = [
  'gray',
  'red',
  'pink',
  'grape',
  'violet',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'green',
  'lime',
  'yellow',
  'orange',
];

const swatchOf = (name: string) => `var(--mantine-color-${name}-6)`;

function ColorSelect({
  value,
  fallback,
  placeholder,
  onChange,
}: {
  value: string;

  fallback: string;
  placeholder: string;
  onChange: (next: string) => void;
}) {
  return (
    <Select
      data={PALETTE.map((name) => ({ value: name, label: name }))}
      value={value === '' ? null : value}
      onChange={(v) => onChange(v ?? '')}
      placeholder={placeholder}
      clearable
      size="sm"
      leftSection={<ColorSwatch color={swatchOf(value || fallback)} size={14} />}
      renderOption={({ option }) => (
        <Group gap={8}>
          <ColorSwatch color={swatchOf(option.value)} size={14} />
          <Text size="sm">{option.label}</Text>
        </Group>
      )}
    />
  );
}

function StatusRowModal<Stage extends string>({
  row,
  vocabulary,
  isInitial,
  onPatch,
  onMakeInitial,
  onClose,
}: {
  row: StatusFlowDraftOf<Stage>['statuses'][number];
  vocabulary: StatusFlowVocabulary<Stage>;
  isInitial: boolean;
  onPatch: (patch: Partial<StatusFlowDraftOf<Stage>['statuses'][number]>) => void;
  onMakeInitial: () => void;
  onClose: () => void;
}) {
  const { stages, stageColors, initialStage, recordNoun } = vocabulary;
  const capabilities = vocabulary.capabilities ?? [];
  const offered = capabilities.filter((capability) => capability.stages.includes(row.stage));

  return (
    <Modal opened onClose={onClose} title="Status" centered size="lg">
      <Stack gap="sm">
        <TextInput
          label="Value"
          description="What is STORED, and what every other config names this status by. Renaming it here rewrites the transition matrix and the department rows with it."
          placeholder="value"
          value={row.value}
          onChange={(e) => onPatch({ value: e.currentTarget.value })}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label="Label"
            description="On the badge. Empty keeps the app's own wording."
            value={row.label}
            onChange={(e) => onPatch({ label: e.currentTarget.value })}
          />
          <TextInput
            label="Action label"
            description={`On the button that moves ${recordNoun} here. Empty repeats the label.`}
            value={row.actionLabel}
            onChange={(e) => onPatch({ actionLabel: e.currentTarget.value })}
          />
        </SimpleGrid>
        <Select
          label="Stage"
          description="The stage — never the name — decides what moves stock."
          data={stages}
          value={row.stage}
          onChange={(v) => v && onPatch({ stage: v as Stage })}
          allowDeselect={false}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Stack gap={4}>
            <Text fz="sm" fw={500}>
              Color
            </Text>
            <ColorSelect
              value={row.color}
              fallback={stageColors[row.stage]}
              placeholder="stage default"
              onChange={(color) => onPatch({ color })}
            />
          </Stack>
          <Stack gap={4}>
            <Text fz="sm" fw={500}>
              Action color
            </Text>
            {/* Falls back to the badge's colour, not to the stage's: a client
                that recoloured the badge means the button to follow it, and
                defaulting past that would undo the choice they just made. */}
            <ColorSelect
              value={row.actionColor}
              fallback={row.color || stageColors[row.stage]}
              placeholder="same as status"
              onChange={(actionColor) => onPatch({ actionColor })}
            />
          </Stack>
        </SimpleGrid>

        {capabilities.length > 0 && (
          <Stack gap={6}>
            <Text fz="sm" fw={500}>
              Entry effects
            </Text>
            {offered.length === 0 ? (
              <Text fz="xs" c="dimmed">
                No effect can be attached to a {row.stage}-stage status in this module.
              </Text>
            ) : (
              offered.map((capability) => (
                <Checkbox
                  key={capability.id}
                  checked={row.capabilities.includes(capability.id)}
                  onChange={() =>
                    onPatch({
                      capabilities: row.capabilities.includes(capability.id)
                        ? row.capabilities.filter((id) => id !== capability.id)
                        : [...row.capabilities, capability.id],
                    })
                  }
                  label={capability.label}
                  description={capability.description}
                />
              ))
            )}
          </Stack>
        )}

        <Radio
          checked={isInitial}
          onChange={onMakeInitial}
          disabled={row.stage !== initialStage || row.value.trim() === ''}
          label="New records start here"
          description={
            row.stage === initialStage
              ? 'Exactly one status is the first. Naming this one moves it off whichever holds it now.'
              : `Only a ${initialStage}-stage status can be the first one.`
          }
        />

        <Group justify="flex-end">
          <Button onClick={onClose}>Done</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export type StatusFlowVocabulary<Stage extends string> = {
  stages: Array<{ value: Stage; label: string }>;

  stageColors: Readonly<Record<Stage, string>>;

  defaultFlow: StatusFlowConfig<Stage>;

  initialStage: Stage;

  recordNoun: string;

  defaultLifecycle: string;

  capabilities?: Array<StatusCapability<Stage> & { label: string; description: string }>;
};

export function StatusFlowEditor<Stage extends string>({
  vocabulary,
  value,
  onChange,
  departmentOptions,
  storedUnreadable,
}: {
  vocabulary: StatusFlowVocabulary<Stage>;
  value: StatusFlowDraftOf<Stage> | null;
  onChange: (next: StatusFlowDraftOf<Stage> | null) => void;
  departmentOptions: Array<{ value: string; label: string }>;

  storedUnreadable: boolean;
}) {
  const draft = value;
  const { stageColors, defaultFlow, initialStage, recordNoun, defaultLifecycle } = vocabulary;
  const capabilities = vocabulary.capabilities ?? [];

  const [editing, setEditing] = useState<number | null>(null);
  const editingRow = draft !== null && editing !== null ? draft.statuses[editing] : undefined;

  const renameValue = (from: StatusFlowDraftOf<Stage>, oldValue: string, newValue: string) => {
    const rekey = (map: Record<string, string[]>) =>
      Object.fromEntries(
        Object.entries(map).map(([key, list]) => [
          key === oldValue ? newValue : key,
          list.map((item) => (item === oldValue ? newValue : item)),
        ]),
      );
    return {
      ...from,
      initial: from.initial === oldValue ? newValue : from.initial,
      transitions: rekey(from.transitions),
      targetDepartments: rekey(from.targetDepartments),
    };
  };

  const updateRow = (idx: number, patch: Partial<StatusFlowDraftOf<Stage>['statuses'][number]>) => {
    if (!draft) return;
    const oldValue = draft.statuses[idx]!.value;
    let next: StatusFlowDraftOf<Stage> = {
      ...draft,
      statuses: draft.statuses.map((row, i) => {
        if (i !== idx) return row;
        const merged = { ...row, ...patch };

        return {
          ...merged,
          capabilities: merged.capabilities.filter((id) =>
            capabilities.some((c) => c.id === id && c.stages.includes(merged.stage)),
          ),
        };
      }),
    };
    if (patch.value !== undefined && patch.value !== oldValue) {
      next = renameValue(next, oldValue, patch.value);
    }
    onChange(next);
  };

  const removeRow = (idx: number) => {
    if (!draft) return;
    const gone = draft.statuses[idx]!.value;
    const scrub = (map: Record<string, string[]>) =>
      Object.fromEntries(
        Object.entries(map)
          .filter(([key]) => key !== gone)
          .map(([key, list]) => [key, list.filter((item) => item !== gone)]),
      );
    onChange({
      ...draft,
      statuses: draft.statuses.filter((_, i) => i !== idx),
      initial: draft.initial === gone ? '' : draft.initial,
      transitions: scrub(draft.transitions),
      targetDepartments: scrub(draft.targetDepartments),
    });
  };

  const addRow = () => {
    if (!draft) return;

    setEditing(draft.statuses.length);
    onChange({
      ...draft,
      statuses: [
        ...draft.statuses,
        {
          value: '',
          label: '',
          color: '',
          actionLabel: '',
          actionColor: '',

          stage: initialStage,
          capabilities: [],
        },
      ],
    });
  };

  const toggleTargetDepartment = (target: string, department: string) => {
    if (!draft) return;
    const current = draft.targetDepartments[target] ?? [];
    const next = current.includes(department)
      ? current.filter((item) => item !== department)
      : [...current, department];
    onChange({
      ...draft,
      targetDepartments: { ...draft.targetDepartments, [target]: next },
    });
  };

  return (
    <Stack gap="sm">
      <Switch
        checked={draft !== null}
        onChange={(e) =>
          onChange(e.currentTarget.checked ? defaultStatusFlowDraftOf(defaultFlow) : null)
        }
        label="Custom status flow"
        description={`Off = the default ${defaultLifecycle} lifecycle. On starts from that lifecycle; rename, recolor and extend it. Each status declares its STAGE, and the stage — never the name — decides what moves stock. Label and color dress the BADGE; action label and action color dress the button that moves ${recordNoun} into that status — “Đã xác nhận” on the badge, “Xác nhận” on the button.`}
      />
      {storedUnreadable && (
        <Text size="xs" c="red">
          The stored status flow could not be read as rows — saving from here replaces it.
        </Text>
      )}

      {draft && (
        <>
          <Table withRowBorders={false} verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Status</Table.Th>
                <Table.Th w={160}>Stage</Table.Th>
                {capabilities.length > 0 && <Table.Th w={200}>Entry effects</Table.Th>}
                <Table.Th w={40} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {draft.statuses.map((row, idx) => (
                <Table.Tr
                  key={idx}
                  onClick={() => setEditing(idx)}
                  style={{ cursor: 'pointer' }}
                  title="Edit this status"
                >
                  <Table.Td>
                    <Group gap={8} wrap="nowrap">
                      <ColorSwatch
                        color={swatchOf(row.color || stageColors[row.stage])}
                        size={14}
                      />
                      <Text fz="sm" fw={500}>
                        {row.label || row.value || (
                          <Text component="span" c="dimmed">
                            (unnamed)
                          </Text>
                        )}
                      </Text>
                      {/* The stored VALUE is the join key every other config
                          names — hiding it behind the label would make a
                          transition matrix row unmatchable to its status. */}
                      {row.label !== '' && row.value !== '' && (
                        <Text fz="xs" c="dimmed" ff="monospace">
                          {row.value}
                        </Text>
                      )}
                      {draft.initial === row.value && row.value !== '' && (
                        <Badge size="xs" variant="light" color="gray">
                          initial
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text fz="sm">{row.stage}</Text>
                  </Table.Td>
                  {capabilities.length > 0 && (
                    <Table.Td>
                      <Group gap={4}>
                        {capabilities
                          .filter((capability) => row.capabilities.includes(capability.id))
                          .map((capability) => (
                            <Badge key={capability.id} size="xs" variant="light">
                              {capability.label}
                            </Badge>
                          ))}
                      </Group>
                    </Table.Td>
                  )}
                  <Table.Td>
                    <Group gap={4} wrap="nowrap" justify="flex-end">
                      <ActionIcon variant="subtle" size="lg" aria-label="Edit status">
                        <IconPencil size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="lg"
                        aria-label="Remove status"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRow(idx);
                        }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Button
            variant="light"
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={addRow}
            w="fit-content"
          >
            Add status
          </Button>

          {editing !== null && editingRow && (
            <StatusRowModal
              row={editingRow}
              vocabulary={vocabulary}
              isInitial={draft.initial === editingRow.value && editingRow.value !== ''}
              onPatch={(patch) => updateRow(editing, patch)}
              onMakeInitial={() => onChange({ ...draft, initial: editingRow.value })}
              onClose={() => setEditing(null)}
            />
          )}

          <StatusTransitionMatrixEditor
            statusOptions={draft.statuses.map((row) => ({
              value: row.value,
              label: { '': row.label || row.value },
              color: `var(--mantine-color-${row.color || stageColors[row.stage]}-6)`,
            }))}
            transitions={draft.transitions}
            onChange={(transitions) => onChange({ ...draft, transitions })}
          />

          {departmentOptions.length > 0 && (
            <Stack gap="xs">
              <Text fz="sm" fw={500}>
                Status × Department
              </Text>
              <Text fz="xs" c="dimmed">
                Restrict which departments may move {recordNoun} INTO each status. An empty row
                means anyone holding the base permission; the check applies to every transition
                entering that status.
              </Text>
              <Box style={{ overflowX: 'auto' }}>
                <Table withRowBorders withColumnBorders verticalSpacing={4} horizontalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th
                        style={{
                          position: 'sticky',
                          left: 0,
                          background: 'var(--mantine-color-body)',
                          zIndex: 1,
                        }}
                      >
                        <Text fz="xs" c="dimmed" fw={600}>
                          ↓ Status / Department →
                        </Text>
                      </Table.Th>
                      {departmentOptions.map((dept) => (
                        <Table.Th key={dept.value} ta="center" miw={80}>
                          <Text fz="xs" fw={500}>
                            {dept.label}
                          </Text>
                        </Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {draft.statuses.map((row) => (
                      <Table.Tr key={row.value || `row-${row.stage}`}>
                        <Table.Td
                          style={{
                            position: 'sticky',
                            left: 0,
                            background: 'var(--mantine-color-body)',
                            zIndex: 1,
                          }}
                        >
                          <Group gap={6} wrap="nowrap">
                            <ColorSwatch
                              color={swatchOf(row.color || stageColors[row.stage])}
                              size={12}
                            />
                            <Text fz="xs" fw={500}>
                              {row.label || row.value}
                            </Text>
                          </Group>
                        </Table.Td>
                        {departmentOptions.map((dept) => (
                          <Table.Td key={dept.value} ta="center">
                            <Checkbox
                              size="xs"
                              checked={(draft.targetDepartments[row.value] ?? []).includes(
                                dept.value,
                              )}
                              onChange={() => toggleTargetDepartment(row.value, dept.value)}
                              styles={{ input: { cursor: 'pointer' } }}
                            />
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Box>
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
