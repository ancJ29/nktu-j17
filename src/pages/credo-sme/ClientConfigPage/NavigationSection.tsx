import { Alert, Button, Group, MultiSelect, Stack, Table, TagsInput, Text } from '@mantine/core';
import { useCallback, useMemo, useState } from 'react';
import { NAV_PERMISSION_MODULE, NAV_REGISTRY, type NavId } from '@/config/navigation';
import { NavTreeEditor } from '@/pages/config/NavTreeEditor';
import {
  configToState,
  stateToConfigItems,
  type NavPlatformState,
} from '@/pages/config/navTreeState';
import type { NavigationItem } from '@/types';
import type { DepartmentOption } from './optionFields';
import {
  PERMISSION_MODULES,
  type PermissionForm,
  type PermissionModuleKey,
} from './permissionFields';
import {
  emptyRule,
  flattenVisibleNav,
  V2_NAV_IDS,
  type NavigationForm,
  type ViewerRule,
} from './navigationFields';

const rowLabel = (item: NavigationItem) => item.label || item.labelKey || item.id;

const MODELLED_MODULES = new Set<string>(PERMISSION_MODULES.map((m) => m.key));

function rowWarnings(id: string, permissions: PermissionForm): string[] {
  const notes: string[] = [];
  const module = NAV_PERMISSION_MODULE[id as NavId];
  if (module && MODELLED_MODULES.has(module)) {
    const granted = permissions[module as PermissionModuleKey]?.['canView'] === true;
    if (!granted) {
      notes.push(`No client-layer ${module}.canView — hidden unless an employee is granted it`);
    }
  }
  if (NAV_REGISTRY[id as NavId]?.rootOnly) notes.push('root users only');
  return notes;
}

export function NavigationSection({
  value,
  legacyPc,
  departmentOptions,
  permissions,
  onChange,
}: {
  value: NavigationForm;

  legacyPc: NavigationItem[];
  departmentOptions: DepartmentOption[];

  permissions: PermissionForm;
  onChange: (next: NavigationForm) => void;
}) {
  const [treeState, setTreeState] = useState<NavPlatformState>(() =>
    configToState(value.pc ?? [], V2_NAV_IDS),
  );

  const handleTree = useCallback(
    (next: NavPlatformState) => {
      setTreeState(next);
      onChange({ ...value, pc: stateToConfigItems(next) as NavigationItem[] });
    },
    [onChange, value],
  );

  const enable = useCallback(
    (seed: NavigationItem[]) => {
      const state = configToState(seed, V2_NAV_IDS);
      setTreeState(state);
      onChange({ ...value, pc: stateToConfigItems(state) as NavigationItem[] });
    },
    [onChange, value],
  );

  const setRule = useCallback(
    (id: string, patch: Partial<ViewerRule>) => {
      const next = { ...value.rules, [id]: { ...(value.rules[id] ?? emptyRule()), ...patch } };
      onChange({ ...value, rules: next });
    },
    [onChange, value],
  );

  const deptData = useMemo(
    () =>
      departmentOptions.map((d) => ({
        value: d.value,
        label: Object.values(d.label ?? {})[0] || d.value,
      })),
    [departmentOptions],
  );

  const rows = useMemo(() => flattenVisibleNav(value.pc ?? []), [value.pc]);

  if (!value.pc) {
    return (
      <Stack gap="sm">
        <Alert color="blue" variant="light">
          This client has no <b>navigationV2</b>, so the app serves its legacy <b>navigation</b>.
          Creating one takes over the <b>desktop</b> menu only — mobile keeps reading the legacy
          tree either way.
        </Alert>
        <Group gap="xs">
          <Button size="xs" onClick={() => enable(legacyPc)} disabled={legacyPc.length === 0}>
            Start from this client&apos;s current menu
          </Button>
          <Button size="xs" variant="default" onClick={() => enable([])}>
            Start empty
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <NavTreeEditor label="Desktop (PC)" state={treeState} onChange={handleTree} />

      <Stack gap="xs">
        <Text fw={500} size="sm">
          Who sees what
        </Text>
        <Text size="xs" c="dimmed">
          Leave both empty and everyone sees the item. Naming employees is an <b>allowlist</b> and
          it wins over a hidden department, so an exception does not need the department rule
          rewritten. Employee <b>ids</b>, not names — this page cannot read another client&apos;s
          employee list.
        </Text>
        {rows.length === 0 ? (
          <Text size="xs" c="dimmed">
            Nothing is switched on above yet.
          </Text>
        ) : (
          <Table striped withTableBorder verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: '28%' }}>Item</Table.Th>
                <Table.Th>Hidden for departments</Table.Th>
                <Table.Th>Visible only for employee ids</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((item) => {
                const rule = value.rules[item.id] ?? emptyRule();
                return (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Text size="sm">{rowLabel(item)}</Text>
                      <Text size="xs" c="dimmed">
                        {item.id}
                      </Text>
                      {rowWarnings(item.id, permissions).map((note) => (
                        <Text key={note} size="xs" c="orange.7">
                          {note}
                        </Text>
                      ))}
                    </Table.Td>
                    <Table.Td>
                      <MultiSelect
                        size="xs"
                        data={deptData}
                        value={rule.hiddenForDepartments}
                        onChange={(v) => setRule(item.id, { hiddenForDepartments: v })}
                        placeholder={deptData.length ? 'Everyone' : 'No departments configured'}
                        disabled={deptData.length === 0}
                        clearable
                        searchable
                      />
                    </Table.Td>
                    <Table.Td>
                      <TagsInput
                        size="xs"
                        value={rule.visibleForEmployeeIds}
                        onChange={(v) => setRule(item.id, { visibleForEmployeeIds: v })}
                        placeholder="Everyone"
                        clearable
                      />
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      <Group justify="flex-end">
        <Button
          size="xs"
          variant="subtle"
          color="red"
          onClick={() => onChange({ pc: null, rules: {} })}
        >
          Remove navigationV2 (back to the legacy menu)
        </Button>
      </Group>
    </Stack>
  );
}
