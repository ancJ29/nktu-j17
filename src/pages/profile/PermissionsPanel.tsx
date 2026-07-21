import { appConfig } from '@/config';
import { getEffectivePermissions, deepMergePermissions } from '@/utils/permission';
import {
  BASE_PERMISSIONS,
  CRUD_KEYS,
  type Permissions,
  type ModulePermissions,
  type PartialPermissions,
} from '@/types/permissions';
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconCheck, IconDeviceFloppy, IconShield, IconX } from '@tabler/icons-react';
import { FieldLabel } from '@credo/base-ui/components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type PermissionsPanelProps = {
  
  permissions?: PartialPermissions;
  
  resolvedBase?: Permissions;
  
  onSave?: (perms: PartialPermissions) => Promise<void> | void;
};

export function PermissionsPanel({ permissions, resolvedBase, onSave }: PermissionsPanelProps) {
  const { t } = useTranslation();
  const editable = !!onSave;

  
  const cleanedPermissions = useMemo(
    () => (editable ? stripRedundant(permissions ?? {}, resolvedBase) : {}),
    
    
    [permissions, resolvedBase],
  );

  
  const [draft, setDraft] = useState<PartialPermissions>(cleanedPermissions);
  const [saving, setSaving] = useState(false);

  
  useEffect(() => {
    
    if (editable) setDraft(cleanedPermissions);
  }, [cleanedPermissions, editable]);

  
  const isDirty = editable && JSON.stringify(draft) !== JSON.stringify(cleanedPermissions);

  
  
  const displayPerms: Permissions = editable
    ? deepMergePermissions(resolvedBase ?? BASE_PERMISSIONS, draft)
    : getEffectivePermissions();

  
  
  const clientResolved = useMemo(
    () => deepMergePermissions(BASE_PERMISSIONS, appConfig.permissions),
    [],
  );
  const moduleKeys = Object.keys(displayPerms).filter((key) => hasAnyGranted(clientResolved[key]));

  
  
  
  const defaultOpenModules = useMemo(
    () => moduleKeys.filter((key) => moduleHasSubPerms(displayPerms[key])),
    
    [],
  );

  const handleCrudToggle = useCallback(
    (moduleKey: string, key: string, checked: boolean) => {
      if (!editable) return;
      setDraft((prev) => {
        const mod = prev[moduleKey] ?? {};
        const next = { ...mod };
        const baseVal = resolvedBase?.[moduleKey]?.[key as keyof ModulePermissions] ?? false;
        if (checked !== baseVal) {
          (next as Record<string, unknown>)[key] = checked;
        } else {
          delete (next as Record<string, unknown>)[key];
        }
        return cleanModule(prev, moduleKey, next);
      });
    },
    [editable, resolvedBase],
  );

  const handleSubToggle = useCallback(
    (moduleKey: string, group: 'actions' | 'query', key: string, checked: boolean) => {
      if (!editable) return;
      setDraft((prev) => {
        const mod = prev[moduleKey] ?? {};
        const sub = { ...(mod[group] ?? {}) };
        const baseVal = resolvedBase?.[moduleKey]?.[group]?.[key] ?? false;
        if (checked !== baseVal) {
          sub[key] = checked;
        } else {
          delete sub[key];
        }
        const nextMod = { ...mod, [group]: Object.keys(sub).length > 0 ? sub : undefined };
        if (!nextMod[group]) delete nextMod[group];
        return cleanModule(prev, moduleKey, nextMod);
      });
    },
    [editable, resolvedBase],
  );

  
  const handleSetAllForModule = useCallback(
    (moduleKey: string, value: boolean) => {
      if (!editable) return;
      const schema = BASE_PERMISSIONS[moduleKey];
      if (!schema) return;
      setDraft((prev) => {
        const baseMod = resolvedBase?.[moduleKey];
        const next: PartialPermissions[string] = {};

        for (const key of CRUD_KEYS) {
          const baseVal = baseMod?.[key] ?? false;
          if (value !== baseVal) (next as Record<string, unknown>)[key] = value;
        }

        if (schema.actions) {
          const actions: Record<string, boolean> = {};
          for (const key of Object.keys(schema.actions)) {
            const baseVal = baseMod?.actions?.[key] ?? false;
            if (value !== baseVal) actions[key] = value;
          }
          if (Object.keys(actions).length > 0) next.actions = actions;
        }

        if (schema.query) {
          const query: Record<string, boolean> = {};
          for (const key of Object.keys(schema.query)) {
            const baseVal = baseMod?.query?.[key] ?? false;
            if (value !== baseVal) query[key] = value;
          }
          if (Object.keys(query).length > 0) next.query = query;
        }

        return cleanModule(prev, moduleKey, next);
      });
    },
    [editable, resolvedBase],
  );

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }, [onSave, draft]);

  return (
    <Card withBorder padding="lg">
      <Group gap="xs" mb="sm">
        <IconShield size={18} style={{ opacity: 0.5 }} />
        <FieldLabel size="sm" lts={0.5}>
          {t('profile.permissions')}
        </FieldLabel>
      </Group>

      <Divider mb="md" />

      {/* CRUD column headers */}
      <Group justify="space-between" mb="xs" pr={4}>
        <Box style={{ flex: 1 }} />
        <Group gap="lg" wrap="nowrap">
          {CRUD_KEYS.map((key) => (
            <FieldLabel key={key} ta="center" w={44}>
              {t(`profile.perm.${key}`)}
            </FieldLabel>
          ))}
        </Group>
      </Group>

      <Accordion
        variant="separated"
        chevronPosition="left"
        multiple
        defaultValue={defaultOpenModules}
      >
        {moduleKeys.map((moduleKey) => {
          const mod = displayPerms[moduleKey];
          const enabledCount = CRUD_KEYS.filter((k) => mod[k]).length;
          
          
          const moduleCustom = editable && isModuleCustom(draft, moduleKey);
          
          
          
          const hasSubPerms = moduleHasSubPerms(mod);

          return (
            <Accordion.Item key={moduleKey} value={moduleKey}>
              <Accordion.Control
                
                
                
                
                
                
                
                
                disabled={!hasSubPerms && !editable}
                chevron={hasSubPerms ? undefined : null}
                style={!hasSubPerms ? { opacity: 1, cursor: 'default' } : undefined}
              >
                <Group justify="space-between" wrap="nowrap" pr="xs">
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm" fw={500}>
                      {t(`profile.perm.modules.${moduleKey}`, moduleKey)}
                    </Text>
                    <Badge size="xs" variant="light" color="gray">
                      {enabledCount}/{CRUD_KEYS.length}
                    </Badge>
                    {moduleCustom && (
                      <Tooltip
                        label={t('profile.perm.customHint')}
                        position="top"
                        withArrow
                        openDelay={400}
                      >
                        <Badge size="xs" variant="light" color="orange">
                          {t('profile.perm.custom')}
                        </Badge>
                      </Tooltip>
                    )}
                    {editable && (
                      <Group
                        gap={4}
                        wrap="nowrap"
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'default' }}
                      >
                        <Tooltip
                          label={t('profile.perm.enableAll')}
                          position="top"
                          withArrow
                          openDelay={400}
                        >
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="green"
                            onClick={() => handleSetAllForModule(moduleKey, true)}
                          >
                            <IconCheck size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip
                          label={t('profile.perm.disableAll')}
                          position="top"
                          withArrow
                          openDelay={400}
                        >
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            onClick={() => handleSetAllForModule(moduleKey, false)}
                          >
                            <IconX size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    )}
                  </Group>

                  <Group
                    gap="lg"
                    wrap="nowrap"
                    onClick={editable ? (e) => e.stopPropagation() : undefined}
                    style={{ cursor: editable ? 'default' : undefined }}
                  >
                    {CRUD_KEYS.map((key) => {
                      
                      const crudCustom = editable && isCrudCustom(draft, moduleKey, key);
                      return (
                        <Box key={key} w={44} ta="center" pos="relative">
                          <Checkbox
                            size="sm"
                            checked={mod[key]}
                            disabled={!editable}
                            onChange={
                              editable
                                ? (e) => handleCrudToggle(moduleKey, key, e.currentTarget.checked)
                                : undefined
                            }
                            styles={{ input: { cursor: editable ? 'pointer' : 'default' } }}
                          />
                          {crudCustom && (
                            <Box
                              pos="absolute"
                              top={-3}
                              right={8}
                              w={7}
                              h={7}
                              style={{
                                borderRadius: '50%',
                                backgroundColor: 'var(--mantine-color-orange-6)',
                              }}
                            />
                          )}
                        </Box>
                      );
                    })}
                  </Group>
                </Group>
              </Accordion.Control>

              <Accordion.Panel>
                <SubPermissions
                  mod={mod}
                  moduleKey={moduleKey}
                  editable={editable}
                  overlay={editable ? draft : undefined}
                  onToggle={handleSubToggle}
                />
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>

      {editable && (
        <Group justify="flex-end" mt="md">
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={handleSave}
            loading={saving}
            disabled={!isDirty}
          >
            {t('__new__.01-common.actions.save')}
          </Button>
        </Group>
      )}
    </Card>
  );
}

function stripRedundant(overlay: PartialPermissions, base?: Permissions): PartialPermissions {
  if (!base || Object.keys(overlay).length === 0) return overlay;

  const result: PartialPermissions = {};
  for (const [moduleKey, mod] of Object.entries(overlay)) {
    const baseMod = base[moduleKey];
    if (!baseMod || !mod) {
      result[moduleKey] = mod;
      continue;
    }

    const cleaned: PartialPermissions[string] = {};

    
    for (const key of CRUD_KEYS) {
      if (mod[key] !== undefined && mod[key] !== baseMod[key]) {
        (cleaned as Record<string, unknown>)[key] = mod[key];
      }
    }

    
    if (mod.actions) {
      const cleanedActions: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(mod.actions)) {
        if (v !== (baseMod.actions?.[k] ?? false)) {
          cleanedActions[k] = v;
        }
      }
      if (Object.keys(cleanedActions).length > 0) cleaned.actions = cleanedActions;
    }

    
    if (mod.query) {
      const cleanedQuery: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(mod.query)) {
        if (v !== (baseMod.query?.[k] ?? false)) {
          cleanedQuery[k] = v;
        }
      }
      if (Object.keys(cleanedQuery).length > 0) cleaned.query = cleanedQuery;
    }

    
    const hasCrud = CRUD_KEYS.some((k) => (cleaned as Record<string, unknown>)[k] !== undefined);
    if (hasCrud || cleaned.actions || cleaned.query) {
      result[moduleKey] = cleaned;
    }
  }

  return result;
}

function isModuleCustom(overlay: PartialPermissions, moduleKey: string): boolean {
  const mod = overlay[moduleKey];
  
  return !!mod && Object.keys(mod).length > 0;
}

function isCrudCustom(overlay: PartialPermissions, moduleKey: string, key: string): boolean {
  return (overlay[moduleKey] as Record<string, unknown> | undefined)?.[key] !== undefined;
}

function isSubCustom(
  overlay: PartialPermissions,
  moduleKey: string,
  group: 'actions' | 'query',
  key: string,
): boolean {
  return overlay[moduleKey]?.[group]?.[key] !== undefined;
}

function moduleHasSubPerms(mod: ModulePermissions | undefined): boolean {
  if (!mod) return false;
  if (mod.actions && Object.keys(mod.actions).length > 0) return true;
  if (mod.query && Object.keys(mod.query).length > 0) return true;
  return false;
}

function hasAnyGranted(mod: ModulePermissions | undefined): boolean {
  if (!mod) return false;
  if (mod.canView || mod.canCreate || mod.canEdit || mod.canDelete) return true;
  if (mod.actions && Object.values(mod.actions).some(Boolean)) return true;
  if (mod.query && Object.values(mod.query).some(Boolean)) return true;
  return false;
}

function cleanModule(
  permissions: PartialPermissions,
  moduleKey: string,
  nextMod: PartialPermissions[string],
): PartialPermissions {
  const hasKeys = Object.keys(nextMod).some(
    (k) =>
      k !== 'actions' && k !== 'query' && (nextMod as Record<string, unknown>)[k] !== undefined,
  );
  const hasActions = nextMod.actions && Object.keys(nextMod.actions).length > 0;
  const hasQuery = nextMod.query && Object.keys(nextMod.query).length > 0;
  if (!hasKeys && !hasActions && !hasQuery) {
    const { [moduleKey]: _, ...rest } = permissions;
    return rest;
  }
  return { ...permissions, [moduleKey]: nextMod };
}

function SubPermissions({
  mod,
  moduleKey,
  editable,
  overlay,
  onToggle,
}: {
  mod: ModulePermissions;
  moduleKey: string;
  editable: boolean;
  
  overlay?: PartialPermissions;
  onToggle: (module: string, group: 'actions' | 'query', key: string, checked: boolean) => void;
}) {
  const { t } = useTranslation();
  const hasActions = mod.actions && Object.keys(mod.actions).length > 0;
  const hasQuery = mod.query && Object.keys(mod.query).length > 0;

  if (!hasActions && !hasQuery) {
    return (
      <Text size="xs" c="dimmed" fs="italic">
        {t('profile.perm.noExtra')}
      </Text>
    );
  }

  return (
    <Stack gap="md">
      {hasQuery && mod.query && (
        <SubGroup
          label={t('profile.perm.queryGroup')}
          entries={mod.query}
          moduleKey={moduleKey}
          group="query"
          editable={editable}
          overlay={overlay}
          onToggle={onToggle}
        />
      )}
      {hasActions && mod.actions && (
        <SubGroup
          label={t('profile.perm.actionsGroup')}
          entries={mod.actions}
          moduleKey={moduleKey}
          group="actions"
          editable={editable}
          overlay={overlay}
          onToggle={onToggle}
        />
      )}
    </Stack>
  );
}

function SubGroup({
  label,
  entries,
  moduleKey,
  group,
  editable,
  overlay,
  onToggle,
}: {
  label: string;
  entries: Record<string, boolean>;
  moduleKey: string;
  group: 'actions' | 'query';
  editable: boolean;
  
  overlay?: PartialPermissions;
  onToggle: (module: string, group: 'actions' | 'query', key: string, checked: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <Box>
      <Text size="xs" fw={600} c="dimmed" mb={6}>
        {label}
      </Text>
      <Group gap="xs" wrap="wrap">
        {Object.entries(entries).map(([key, value]) => {
          
          const custom = !!overlay && isSubCustom(overlay, moduleKey, group, key);
          return (
            <Tooltip
              key={key}
              label={
                custom
                  ? `${t(`profile.perm.flags.${key}`, key)} · ${t('profile.perm.custom')}`
                  : t(`profile.perm.flags.${key}`, key)
              }
              position="top"
              withArrow
              openDelay={400}
            >
              <Checkbox.Card
                checked={value}
                onClick={editable ? () => onToggle(moduleKey, group, key, !value) : undefined}
                radius="md"
                p="xs"
                withBorder
                style={{
                  width: 'auto',
                  cursor: editable ? 'pointer' : 'default',
                  pointerEvents: editable ? undefined : 'none',
                  opacity: editable ? undefined : 0.7,
                  borderColor: custom ? 'var(--mantine-color-orange-6)' : undefined,
                }}
              >
                <Group gap={6} wrap="nowrap">
                  <Checkbox.Indicator size="sm" />
                  <Text size="xs">{t(`profile.perm.flags.${key}`, key)}</Text>
                  {custom && (
                    <Box
                      w={6}
                      h={6}
                      style={{
                        borderRadius: '50%',
                        backgroundColor: 'var(--mantine-color-orange-6)',
                      }}
                    />
                  )}
                </Group>
              </Checkbox.Card>
            </Tooltip>
          );
        })}
      </Group>
    </Box>
  );
}
