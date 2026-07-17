import {
  CAPABILITY_REGISTRY,
  listCapabilitiesForStage,
} from '@/pages/sales-orders/capabilities/registry';
import type { CMngtSalesOrderStatusOption, CMngtStatusCapabilityBinding } from '@credo/kits/types';
import { Box, Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core';

export function CapabilitiesEditorModal({
  opened,
  onClose,
  status,
  onChange,
}: {
  opened: boolean;
  onClose: () => void;
  status: CMngtSalesOrderStatusOption;
  onChange: (caps: CMngtStatusCapabilityBinding[]) => void;
}) {
  const allowed = listCapabilitiesForStage(status.stage);
  const bindingsById = new Map<string, CMngtStatusCapabilityBinding>(
    (status.capabilities ?? []).map((b) => [b.id, b]),
  );

  const titleLabel = Object.values(status.label).find(Boolean) ?? status.value;
  const langCodes = Object.keys(CAPABILITY_REGISTRY['terminal']?.label ?? { en: '' });

  const labelOf = (rec: Record<string, string>) =>
    rec[langCodes[0] ?? 'en'] ?? Object.values(rec).find(Boolean) ?? '';

  const toggle = (capId: string, checked: boolean) => {
    if (checked) {
      const next: CMngtStatusCapabilityBinding[] = [...(status.capabilities ?? []), { id: capId }];
      onChange(next);
    } else {
      onChange((status.capabilities ?? []).filter((b) => b.id !== capId));
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`Capabilities — ${titleLabel}`} size="lg">
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          {`Capabilities allowed in stage "${status.stage}". Tick to attach; per-binding settings appear inline.`}
        </Text>
        {allowed.length === 0 && (
          <Text size="sm" c="dimmed">
            No capabilities are allowed for this stage.
          </Text>
        )}
        {allowed.map((cap) => {
          const checked = bindingsById.has(cap.id);
          return (
            <Box
              key={cap.id}
              p="sm"
              style={{
                border: '1px solid var(--mantine-color-gray-3)',
                borderRadius: 6,
              }}
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Group gap="xs">
                    <Checkbox
                      checked={checked}
                      onChange={(e) => toggle(cap.id, e.currentTarget.checked)}
                      label={
                        <Text size="sm" fw={500}>
                          {labelOf(cap.label)}
                        </Text>
                      }
                    />
                    {cap.singleton && (
                      <Text size="xs" c="orange.7">
                        (must be set on exactly one status)
                      </Text>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>
                    {labelOf(cap.description)}
                  </Text>
                  {/* `reservesStock` previously had a per-binding `blockOnShortage`
                      toggle here. Replaced by the global `salesOrders.shortagePolicy`
                      flag — surface it from the SO features page, not per-binding. */}
                </Box>
              </Group>
            </Box>
          );
        })}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
