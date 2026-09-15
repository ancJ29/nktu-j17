/** Separate because two layers render the same grid — see `permissionFields`. */

import { Checkbox, Group, Paper, Stack, Text } from '@mantine/core';
import { CRUD, PERMISSION_MODULES, type PermissionForm } from './permissionFields';

/**
 * The grid, at either layer.
 *
 * **`ceiling` is what makes the DEPARTMENT layer honest.** A department overlay
 * stores only revocations, so a ticked box there means "inherit" — and with
 * nothing to inherit, ticked rendered exactly like a grant while resolving to
 * denied. The layer can restrict and never widen, so a flag the client does not
 * grant is not editable here at all: it renders unticked and disabled rather
 * than as a promise this layer cannot keep.
 *
 * A module the ceiling grants nothing on is dropped entirely, matching the
 * older editor at `pages/config/AppConfigPage` — there is nothing to restrict.
 *
 * The CLIENT layer passes no ceiling. Its own is BASE, which grants nothing, so
 * a ceiling there would disable every box in the app.
 *
 * `mixed` drives the all-departments grid, where one box stands for many rows
 * that may disagree. A box that is neither on nor off must SAY so — rendered
 * as plain unticked it would read as "every department is restricted", and the
 * click that follows would revoke the ones that were not.
 */
export function PermissionGrid({
  value,
  onChange,
  ceiling,
  mixed,
}: {
  value: PermissionForm;
  onChange: (next: PermissionForm) => void;
  /** The layer above's grants. Omit at the client layer. */
  ceiling?: PermissionForm;
  /** Flags whose underlying rows disagree. Omit when one row is being edited. */
  mixed?: PermissionForm;
}) {
  const toggle = (moduleKey: keyof PermissionForm, flag: string, checked: boolean) =>
    onChange({ ...value, [moduleKey]: { ...value[moduleKey], [flag]: checked } });

  /** Granted above, so editable here. Everything is when there is no ceiling. */
  const granted = (moduleKey: keyof PermissionForm, flag: string): boolean =>
    ceiling === undefined || ceiling[moduleKey][flag] === true;

  /** Indeterminate only where the flag is editable — a disabled box says enough. */
  const isMixed = (moduleKey: keyof PermissionForm, flag: string): boolean =>
    mixed?.[moduleKey][flag] === true && granted(moduleKey, flag);

  const modules = PERMISSION_MODULES.filter(
    (module) =>
      ceiling === undefined ||
      CRUD.some((c) => granted(module.key, c.key)) ||
      module.actions.some((a) => granted(module.key, a.key)),
  );

  if (modules.length === 0) {
    return (
      <Text fz="sm" c="dimmed" fs="italic">
        The client layer grants nothing, so there is nothing to restrict here. Grant it above first.
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      {modules.map((module) => (
        <Paper key={module.key} p="xs" withBorder>
          <Stack gap={6}>
            <Text fz="sm" fw={600}>
              {module.label}
            </Text>
            <Group gap="lg">
              {CRUD.map((crud) => (
                <Checkbox
                  key={crud.key}
                  size="sm"
                  label={crud.label}
                  checked={value[module.key][crud.key] === true && granted(module.key, crud.key)}
                  indeterminate={isMixed(module.key, crud.key)}
                  disabled={!granted(module.key, crud.key)}
                  onChange={(e) => toggle(module.key, crud.key, e.currentTarget.checked)}
                />
              ))}
            </Group>
            {module.actions.length > 0 && (
              <Group gap="lg">
                {module.actions.map((action) => (
                  <Checkbox
                    key={action.key}
                    size="sm"
                    label={action.label}
                    checked={
                      value[module.key][action.key] === true && granted(module.key, action.key)
                    }
                    indeterminate={isMixed(module.key, action.key)}
                    disabled={!granted(module.key, action.key)}
                    onChange={(e) => toggle(module.key, action.key, e.currentTarget.checked)}
                  />
                ))}
              </Group>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
