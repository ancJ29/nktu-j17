import { ICON_MAP, IconName } from '@credo/base-ui/components';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Grid,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconDeviceMobile,
  IconFolder,
  IconFolderOff,
  IconFolderPlus,
  IconGripVertical,
  IconLayoutGrid,
  IconTrash,
} from '@tabler/icons-react';
import { memo, useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { IconPicker } from './IconPicker';
import {
  getDisplayLabel,
  getRegistryEntry,
  isCustomGroup,
  isGroup,
  newCustomGroupId,
  type NavGroupState,
  type NavItemState,
  type NavPlatformState,
} from './navTreeState';

type DropPosition = 'before' | 'after' | 'into';

type DragOverTarget = {
  id: string;
  position: DropPosition;
};

type Path = { kind: 'top'; index: number } | { kind: 'sub'; groupIndex: number; subIndex: number };

function findPath(state: NavPlatformState, id: string): Path | null {
  for (let i = 0; i < state.length; i++) {
    if (state[i].id === id) return { kind: 'top', index: i };
    const item = state[i];
    if (isGroup(item)) {
      for (let j = 0; j < item.subs.length; j++) {
        if (item.subs[j].id === id) return { kind: 'sub', groupIndex: i, subIndex: j };
      }
    }
  }
  return null;
}

function getItemAt(state: NavPlatformState, path: Path): NavItemState | NavGroupState {
  if (path.kind === 'top') return state[path.index];
  return (state[path.groupIndex] as NavGroupState).subs[path.subIndex];
}

function removeAt(
  state: NavPlatformState,
  path: Path,
): { next: NavPlatformState; removed: NavItemState | NavGroupState } {
  if (path.kind === 'top') {
    const removed = state[path.index];
    const next = [...state.slice(0, path.index), ...state.slice(path.index + 1)];
    return { next, removed };
  }
  const next = state.map((item, i) => {
    if (i !== path.groupIndex || !isGroup(item)) return item;
    const subs = [...item.subs.slice(0, path.subIndex), ...item.subs.slice(path.subIndex + 1)];
    return { ...item, subs };
  });
  const removed = (state[path.groupIndex] as NavGroupState).subs[path.subIndex];
  return { next, removed };
}

function stripSubs(item: NavItemState | NavGroupState): NavItemState {
  if (!isGroup(item)) return item;
  const { subs: _subs, ...rest } = item;
  void _subs;
  return rest;
}

function canDropOn(
  state: NavPlatformState,
  sourceId: string,
  targetId: string,
  position: DropPosition,
): boolean {
  if (sourceId === targetId) return false;
  const sourcePath = findPath(state, sourceId);
  const targetPath = findPath(state, targetId);
  if (!sourcePath || !targetPath) return false;

  
  if (position === 'into') {
    if (targetPath.kind !== 'top') return false;
    const target = state[targetPath.index];
    if (!isGroup(target)) return false;
    return true;
  }

  
  
  return true;
}

function moveItem(
  state: NavPlatformState,
  sourceId: string,
  targetId: string,
  position: DropPosition,
): NavPlatformState {
  const sourcePath = findPath(state, sourceId);
  const targetPath = findPath(state, targetId);
  if (!sourcePath || !targetPath) return state;
  if (!canDropOn(state, sourceId, targetId, position)) return state;

  const { next: stripped, removed } = removeAt(state, sourcePath);
  
  const newTargetPath = findPath(stripped, targetId);
  if (!newTargetPath) return state;

  if (position === 'into') {
    
    const sub = stripSubs(removed);
    const groupIndex = (newTargetPath as Extract<Path, { kind: 'top' }>).index;
    return stripped.map((item, i) => {
      if (i !== groupIndex || !isGroup(item)) return item;
      return { ...item, subs: [...item.subs, sub] };
    });
  }

  
  if (newTargetPath.kind === 'top') {
    const insertIdx = position === 'before' ? newTargetPath.index : newTargetPath.index + 1;
    return [...stripped.slice(0, insertIdx), removed, ...stripped.slice(insertIdx)];
  }
  
  const sub = stripSubs(removed);
  const { groupIndex, subIndex } = newTargetPath;
  const insertSubIdx = position === 'before' ? subIndex : subIndex + 1;
  return stripped.map((item, i) => {
    if (i !== groupIndex || !isGroup(item)) return item;
    return {
      ...item,
      subs: [...item.subs.slice(0, insertSubIdx), sub, ...item.subs.slice(insertSubIdx)],
    };
  });
}

function setVisibility(state: NavPlatformState, id: string, visible: boolean): NavPlatformState {
  return state.map((item) => {
    if (item.id === id) return { ...item, visible };
    if (isGroup(item)) {
      return {
        ...item,
        subs: item.subs.map((s) => (s.id === id ? { ...s, visible } : s)),
      };
    }
    return item;
  });
}

function setIcon(state: NavPlatformState, id: string, icon: IconName): NavPlatformState {
  return state.map((item) => {
    if (item.id === id) return { ...item, icon };
    if (isGroup(item)) {
      return {
        ...item,
        subs: item.subs.map((s) => (s.id === id ? { ...s, icon } : s)),
      };
    }
    return item;
  });
}

function setCustomLabel(
  state: NavPlatformState,
  id: string,
  customLabel: string,
): NavPlatformState {
  return state.map((item) => {
    if (item.id !== id) return item;
    return { ...item, customLabel };
  });
}

function setNavbar(state: NavPlatformState, id: string, navbar: boolean): NavPlatformState {
  return state.map((item) => (item.id === id ? { ...item, navbar } : item));
}

function countNavbarPinned(state: NavPlatformState): number {
  return state.reduce((n, item) => (item.navbar ? n + 1 : n), 0);
}

function addCustomGroup(state: NavPlatformState, defaultLabel: string): NavPlatformState {
  const newGroup: NavGroupState = {
    id: newCustomGroupId(),
    icon: IconName.Category2,
    visible: true,
    customLabel: defaultLabel,
    subs: [],
  };
  return [...state, newGroup];
}

function convertToGroup(state: NavPlatformState, id: string): NavPlatformState {
  return state.map((item) => {
    if (item.id !== id) return item;
    if (isGroup(item)) return item;
    return { ...item, subs: [] };
  });
}

function convertToFlat(state: NavPlatformState, id: string): NavPlatformState {
  return state.map((item) => {
    if (item.id !== id || !isGroup(item) || item.subs.length > 0) return item;
    const { subs: _subs, ...rest } = item;
    void _subs;
    return rest;
  });
}

function dissolveGroup(state: NavPlatformState, id: string): NavPlatformState {
  const idx = state.findIndex((item) => item.id === id);
  if (idx < 0) return state;
  const item = state[idx];
  if (!isGroup(item)) return state;
  const { subs, ...flatGroup } = item;
  void flatGroup;
  return [...state.slice(0, idx), ...subs, ...state.slice(idx + 1)];
}

const TreeRow = memo(function TreeRow({
  item,
  isSub,
  selected,
  onSelect,
  onDragStart,
  onDragOverRow,
  onDragLeaveRow,
  onDropRow,
  onDragEnd,
  dragOver,
  dragOverPosition,
  draggable,
  hideIntoZone,
  expanded,
  onToggleExpand,
  subCount,
  showNavbarBadge,
}: {
  item: NavItemState | NavGroupState;
  isSub: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, id: string) => void;
  onDragOverRow: (e: DragEvent<HTMLDivElement>, id: string) => void;
  onDragLeaveRow: (e: DragEvent<HTMLDivElement>) => void;
  onDropRow: (e: DragEvent<HTMLDivElement>, id: string) => void;
  onDragEnd: () => void;
  dragOver: boolean;
  dragOverPosition: DropPosition | null;
  draggable: boolean;
  hideIntoZone: boolean;
  expanded?: boolean;
  onToggleExpand?: (id: string) => void;
  subCount?: number;
  
  showNavbarBadge?: boolean;
}) {
  const entry = getRegistryEntry(item.id);
  const ResolvedIcon = ICON_MAP[item.icon] ?? ICON_MAP[IconName.Box];
  const group = isGroup(item);
  const custom = isCustomGroup(item);
  const label = getDisplayLabel(item);
  const subText = entry
    ? `${entry.labelKey}${entry.path ? ` · ${entry.path}` : ''}`
    : 'Custom group';

  const borderTop =
    dragOver && dragOverPosition === 'before' ? '2px solid var(--mantine-color-blue-5)' : undefined;
  const borderBottom =
    dragOver && dragOverPosition === 'after' ? '2px solid var(--mantine-color-blue-5)' : undefined;
  const intoBg =
    dragOver && dragOverPosition === 'into' && !hideIntoZone
      ? 'var(--mantine-color-blue-light)'
      : undefined;

  return (
    <Box
      draggable={draggable}
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragOver={(e) => onDragOverRow(e, item.id)}
      onDragLeave={onDragLeaveRow}
      onDrop={(e) => onDropRow(e, item.id)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(item.id)}
      px="xs"
      py={6}
      ml={isSub ? 'lg' : undefined}
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
        cursor: 'pointer',
        userSelect: 'none',
        background: selected
          ? 'var(--mantine-color-blue-light)'
          : (intoBg ?? (item.visible ? undefined : 'var(--mantine-color-default-hover)')),
        opacity: item.visible ? 1 : 0.55,
        borderTop,
        borderBottom,
        outline: selected ? '1px solid var(--mantine-color-blue-5)' : undefined,
      }}
    >
      <Group gap="xs" wrap="nowrap">
        <ThemeIcon variant="transparent" size="sm" c="dimmed" style={{ cursor: 'grab' }}>
          <IconGripVertical size={14} />
        </ThemeIcon>
        {group ? (
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.(item.id);
            }}
          >
            {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </ActionIcon>
        ) : (
          <Box w={28} />
        )}
        <ThemeIcon variant="light" size="sm" color={item.visible ? undefined : 'gray'}>
          <ResolvedIcon size={14} />
        </ThemeIcon>
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Group gap={6} wrap="nowrap">
            <Text fz="sm" fw={group ? 600 : 500} truncate>
              {label}
            </Text>
            {group && (
              <Badge size="xs" variant="light" color={custom ? 'blue' : 'gray'}>
                {custom ? 'Custom group' : 'Group'}
              </Badge>
            )}
            {showNavbarBadge && item.navbar && !isSub && (
              <Tooltip label="Pinned to bottom navbar" withinPortal>
                <ThemeIcon variant="light" color="blue" size="xs">
                  <IconDeviceMobile size={11} />
                </ThemeIcon>
              </Tooltip>
            )}
          </Group>
          <Text fz="xs" c="dimmed" truncate>
            {subText}
            {group && subCount !== undefined ? ` · ${subCount}` : ''}
          </Text>
        </Box>
      </Group>
    </Box>
  );
});

function NavItemDetail({
  state,
  selectedId,
  onChange,
  showNavbarPin,
  maxNavbarPinned,
}: {
  state: NavPlatformState;
  selectedId: string | null;
  onChange: (next: NavPlatformState) => void;
  
  showNavbarPin?: boolean;
  
  maxNavbarPinned?: number;
}) {
  if (!selectedId) {
    return (
      <Stack align="center" justify="center" h="100%" gap="xs" c="dimmed" p="xl">
        <IconLayoutGrid size={28} />
        <Text fz="sm">Select an item to edit its properties</Text>
      </Stack>
    );
  }

  const path = findPath(state, selectedId);
  if (!path) return null;
  const item = getItemAt(state, path);
  const entry = getRegistryEntry(item.id);
  const group = isGroup(item);
  const custom = isCustomGroup(item);
  const isTopLevel = path.kind === 'top';
  const headerLabel = getDisplayLabel(item);
  const headerSub = entry
    ? `${entry.labelKey}${entry.path ? ` · ${entry.path}` : ''}`
    : 'Custom group';

  return (
    <Stack gap="md" p="sm">
      <Box>
        <Group gap="xs" align="center">
          <Text fz="sm" fw={600}>
            {headerLabel || '(unnamed group)'}
          </Text>
          {group && (
            <Badge size="xs" variant="light" color={custom ? 'blue' : 'gray'}>
              {custom ? 'Custom group' : 'Group'}
            </Badge>
          )}
        </Group>
        <Text fz="xs" c="dimmed">
          {headerSub}
        </Text>
      </Box>

      <Divider />

      {custom && (
        <TextInput
          label="Label"
          description="Custom groups have no i18n key — this label is shown directly."
          value={item.customLabel ?? ''}
          onChange={(e) => onChange(setCustomLabel(state, item.id, e.currentTarget.value))}
          size="xs"
        />
      )}

      <Group justify="space-between">
        <Box>
          <Text fz="sm" fw={500}>
            Visible
          </Text>
          <Text fz="xs" c="dimmed">
            When off, this item is hidden but its position is preserved
          </Text>
        </Box>
        <Switch
          checked={item.visible}
          onChange={(e) => onChange(setVisibility(state, item.id, e.currentTarget.checked))}
        />
      </Group>

      {showNavbarPin &&
        (() => {
          const cap = maxNavbarPinned ?? 4;
          const pinnedCount = countNavbarPinned(state);
          const pinned = !!item.navbar;
          
          const disabled = !isTopLevel || (!pinned && pinnedCount >= cap);
          return (
            <Group justify="space-between">
              <Box>
                <Group gap={6} align="center">
                  <Text fz="sm" fw={500}>
                    Pin to bottom navbar
                  </Text>
                  <Badge size="xs" variant="light" color={pinnedCount > cap ? 'red' : 'gray'}>
                    {pinnedCount}/{cap}
                  </Badge>
                </Group>
                <Text fz="xs" c="dimmed">
                  {!isTopLevel
                    ? 'Only top-level items can be pinned to the bottom navbar.'
                    : `Show this item in the always-visible bottom navbar (max ${cap}). Items here are hidden from the More page.`}
                </Text>
              </Box>
              <Switch
                checked={pinned}
                disabled={disabled}
                onChange={(e) => onChange(setNavbar(state, item.id, e.currentTarget.checked))}
              />
            </Group>
          );
        })()}

      <Box>
        <Text fz="sm" fw={500} mb={6}>
          Icon
        </Text>
        <IconPicker
          value={item.icon}
          onChange={(v) => v && onChange(setIcon(state, item.id, v as IconName))}
        />
      </Box>

      <Divider />

      <Stack gap="xs">
        {/* Registry leaf at top level → can be turned into a (registry) group container. */}
        {!group && !custom && isTopLevel && (
          <Tooltip label="Make this item a group container" withinPortal>
            <Button
              variant="light"
              leftSection={<IconFolder size={14} />}
              onClick={() => onChange(convertToGroup(state, item.id))}
              size="xs"
            >
              Convert to group
            </Button>
          </Tooltip>
        )}
        {/* Registry group with no subs → turn back into a flat item. */}
        {group && !custom && item.subs.length === 0 && (
          <Button
            variant="light"
            leftSection={<IconFolderOff size={14} />}
            onClick={() => onChange(convertToFlat(state, item.id))}
            size="xs"
          >
            Convert to flat item
          </Button>
        )}
        {/* Registry group with subs → dissolve, lift subs to top level. */}
        {group && !custom && item.subs.length > 0 && (
          <Tooltip
            label="Remove the group container, lifting all items to the parent's level"
            withinPortal
          >
            <Button
              variant="light"
              color="orange"
              leftSection={<IconFolderOff size={14} />}
              onClick={() => onChange(dissolveGroup(state, item.id))}
              size="xs"
            >
              Dissolve group
            </Button>
          </Tooltip>
        )}
        {/* Custom group → delete (lifts any subs to top level, then removes the row). */}
        {group && custom && (
          <Tooltip
            label="Remove this custom group, lifting any items to the parent's level"
            withinPortal
          >
            <Button
              variant="light"
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={() => onChange(dissolveGroup(state, item.id))}
              size="xs"
            >
              Delete group
            </Button>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );
}

export function NavTreeEditor({
  label,
  state,
  onChange,
  showNavbarPin,
  maxNavbarPinned = 4,
}: {
  label: string;
  state: NavPlatformState;
  onChange: (next: NavPlatformState) => void;
  showNavbarPin?: boolean;
  maxNavbarPinned?: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [dragOver, setDragOver] = useState<DragOverTarget | null>(null);
  const [sourceIsGroup, setSourceIsGroup] = useState(false);
  const dragSourceRef = useRef<string | null>(null);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  const handleToggleExpand = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, id: string) => {
    dragSourceRef.current = id;
    const path = findPath(stateRef.current, id);
    const item = path ? getItemAt(stateRef.current, path) : null;
    setSourceIsGroup(!!item && isGroup(item) && item.subs.length > 0);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', id);
    } catch {
      // some browsers require setData to start a drag — ignore failures
    }
  }, []);

  const handleDragOverRow = useCallback((e: DragEvent<HTMLDivElement>, id: string) => {
    if (!dragSourceRef.current || dragSourceRef.current === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const third = rect.height / 3;

    const path = findPath(stateRef.current, id);
    const item = path ? getItemAt(stateRef.current, path) : null;
    const isTopLevelGroup = path?.kind === 'top' && item ? isGroup(item) : false;

    let position: DropPosition;
    if (offsetY < third) position = 'before';
    else if (offsetY > rect.height - third && !isTopLevelGroup) position = 'after';
    else if (isTopLevelGroup) position = 'into';
    else position = 'after';

    if (!canDropOn(stateRef.current, dragSourceRef.current, id, position) && position === 'into') {
      
      position = offsetY < rect.height / 2 ? 'before' : 'after';
    }

    setDragOver({ id, position });
  }, []);

  const handleDragLeaveRow = useCallback((e: DragEvent<HTMLDivElement>) => {
    
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDragOver((prev) => prev);
  }, []);

  const handleDropRow = useCallback(
    (e: DragEvent<HTMLDivElement>, id: string) => {
      e.preventDefault();
      const sourceId = dragSourceRef.current;
      const over = dragOver;
      dragSourceRef.current = null;
      setDragOver(null);
      setSourceIsGroup(false);
      if (!sourceId || !over || over.id !== id) return;
      if (!canDropOn(stateRef.current, sourceId, id, over.position)) return;
      const next = moveItem(stateRef.current, sourceId, id, over.position);
      if (next !== stateRef.current) onChange(next);
    },
    [dragOver, onChange],
  );

  const handleDragEnd = useCallback(() => {
    dragSourceRef.current = null;
    setDragOver(null);
    setSourceIsGroup(false);
  }, []);

  const handleAddGroup = useCallback(() => {
    const next = addCustomGroup(stateRef.current, 'New group');
    onChange(next);
    
    setSelectedId(next[next.length - 1].id);
  }, [onChange]);

  const pinnedCount = showNavbarPin ? countNavbarPinned(state) : 0;
  const overCap = showNavbarPin && pinnedCount > maxNavbarPinned;

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Group gap="xs">
          <Text fz="sm" fw={600}>
            {label}
          </Text>
          {showNavbarPin && (
            <Badge
              size="xs"
              variant="light"
              color={overCap ? 'red' : pinnedCount === 0 ? 'gray' : 'blue'}
              leftSection={<IconDeviceMobile size={11} />}
            >
              {`Bottom navbar: ${pinnedCount}/${maxNavbarPinned}`}
            </Badge>
          )}
        </Group>
        <Button
          size="compact-xs"
          variant="light"
          leftSection={<IconFolderPlus size={14} />}
          onClick={handleAddGroup}
        >
          Add group
        </Button>
      </Group>
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Paper withBorder p="xs" radius="sm">
            <ScrollArea.Autosize mah={520}>
              <Stack gap={2}>
                {state.map((item) => {
                  const group = isGroup(item);
                  const isExpanded = group && !collapsed.has(item.id);
                  const isOver = dragOver?.id === item.id;
                  return (
                    <Box key={item.id}>
                      <TreeRow
                        item={item}
                        isSub={false}
                        selected={selectedId === item.id}
                        onSelect={handleSelect}
                        onDragStart={handleDragStart}
                        onDragOverRow={handleDragOverRow}
                        onDragLeaveRow={handleDragLeaveRow}
                        onDropRow={handleDropRow}
                        onDragEnd={handleDragEnd}
                        dragOver={isOver}
                        dragOverPosition={isOver ? dragOver.position : null}
                        draggable
                        hideIntoZone={sourceIsGroup}
                        expanded={isExpanded}
                        onToggleExpand={group ? handleToggleExpand : undefined}
                        subCount={group ? item.subs.length : undefined}
                        showNavbarBadge={showNavbarPin}
                      />
                      {group &&
                        isExpanded &&
                        item.subs.map((sub) => {
                          const subOver = dragOver?.id === sub.id;
                          return (
                            <TreeRow
                              key={sub.id}
                              item={sub}
                              isSub
                              selected={selectedId === sub.id}
                              onSelect={handleSelect}
                              onDragStart={handleDragStart}
                              onDragOverRow={handleDragOverRow}
                              onDragLeaveRow={handleDragLeaveRow}
                              onDropRow={handleDropRow}
                              onDragEnd={handleDragEnd}
                              dragOver={subOver}
                              dragOverPosition={subOver ? dragOver.position : null}
                              draggable
                              hideIntoZone
                              showNavbarBadge={showNavbarPin}
                            />
                          );
                        })}
                    </Box>
                  );
                })}
              </Stack>
            </ScrollArea.Autosize>
          </Paper>
          <Text fz="xs" c="dimmed" mt={4}>
            Drag rows to reorder. Drop on a group row to nest. Click a row to edit it on the right.
          </Text>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper withBorder radius="sm" mih={200}>
            <NavItemDetail
              state={state}
              selectedId={selectedId}
              onChange={onChange}
              showNavbarPin={showNavbarPin}
              maxNavbarPinned={maxNavbarPinned}
            />
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
