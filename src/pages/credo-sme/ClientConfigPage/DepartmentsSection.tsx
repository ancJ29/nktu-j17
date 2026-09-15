import { Alert, Collapse, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useState } from 'react';
import {
  applyAllDepartmentPermissions,
  applyDepartmentPermissions,
  readAllDepartmentPermissions,
  readDepartmentPermissions,
  type DepartmentOption,
} from './optionFields';
import { OptionListEditor } from './OptionListEditor';
import { PermissionGrid } from './PermissionGrid';
import type { PermissionForm } from './permissionFields';

export function DepartmentsSection({
  options,
  langCodes,
  orphaned,
  clientPermissions,
  onChange,
}: {
  options: DepartmentOption[];
  langCodes: string[];

  orphaned: boolean;

  clientPermissions: PermissionForm;
  onChange: (next: DepartmentOption[]) => void;
}) {
  const [openOverlay, setOpenOverlay] = useState<number | null>(null);
  const [openAll, setOpenAll] = useState(false);
  const all = readAllDepartmentPermissions(options);

  return (
    <Stack gap="sm">
      {orphaned && (
        <Alert color="yellow" variant="light">
          The Employees section has <b>Department</b> switched off, so nothing shows a department in
          the app — but these rows still exist, and any restriction below is still applied to
          employees carrying that value.
        </Alert>
      )}

      <Text size="xs" c="dimmed">
        A department&apos;s <b>value</b> is what every employee row stores, and what the resolver
        matches its permission overlay on — renaming one orphans that overlay, so the two are edited
        together here.
      </Text>

      {/* One department has its own grid right below; a second copy of it would
          be two ways to do one thing. */}
      {options.length > 1 && (
        <Paper p="xs" withBorder>
          <UnstyledButton onClick={() => setOpenAll((open) => !open)}>
            <Group gap={6}>
              {openAll ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
              <Text fz="xs" fw={600}>
                Restrictions for ALL departments
              </Text>
            </Group>
          </UnstyledButton>
          <Collapse in={openAll}>
            <Stack gap="xs" mt="lg">
              <Text fz="xs" c="dimmed">
                One box per flag, across every department. A half-filled box means they disagree
                today — ticking or unticking it decides for all of them at once. Flags you do not
                touch are left as each department has them.
              </Text>
              <PermissionGrid
                ceiling={clientPermissions}
                value={all.form}
                mixed={all.mixed}
                onChange={(form) =>
                  onChange(applyAllDepartmentPermissions(options, all.form, form))
                }
              />
            </Stack>
          </Collapse>
        </Paper>
      )}

      <OptionListEditor
        options={options}
        langCodes={langCodes}
        addLabel="Add department"
        emptyHint="No departments configured."
        onChange={onChange}
        renderExtra={(option, index) => (
          <Paper p="xs" withBorder>
            <UnstyledButton onClick={() => setOpenOverlay(openOverlay === index ? null : index)}>
              <Group gap={6}>
                {openOverlay === index ? (
                  <IconChevronDown size={14} />
                ) : (
                  <IconChevronRight size={14} />
                )}
                <Text fz="xs" fw={600}>
                  Restrictions for this department
                </Text>
              </Group>
            </UnstyledButton>
            <Collapse in={openOverlay === index}>
              <Stack gap="xs" mt="lg">
                <Text fz="xs" c="dimmed">
                  Unticking revokes for this department. Ticked means it inherits whatever the
                  client layer grants — a department can restrict, never widen, so anything the
                  client does not grant is shown greyed out.
                </Text>
                <PermissionGrid
                  ceiling={clientPermissions}
                  value={readDepartmentPermissions(option)}
                  onChange={(form) =>
                    onChange(
                      options.map((opt, i) =>
                        i === index ? applyDepartmentPermissions(opt, form) : opt,
                      ),
                    )
                  }
                />
              </Stack>
            </Collapse>
          </Paper>
        )}
      />
    </Stack>
  );
}
