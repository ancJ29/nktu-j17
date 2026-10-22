import { useState } from 'react';
import { ActionIcon, Button, Card, Group, Stack, Text, Textarea, Tooltip } from '@mantine/core';
import { IconNote, IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/SectionCard';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { formatDateTime } from '@/utils/dateFormat';

export type NotesSectionNote = {
  id: string;
  text: string;
  createdAt: number;
  createdBy: string;
  createdByName?: string;
};

type NotesSectionProps = {
  readonly notes: readonly NotesSectionNote[];
  readonly canEdit: boolean;
  readonly onAdd: (text: string) => Promise<void>;
  readonly onRemove: (id: string) => Promise<void>;
};

export function NotesSection({ notes, canEdit, onAdd, onRemove }: NotesSectionProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAdd = async () => {
    const text = draft.trim();
    if (!text) return;
    setAdding(true);
    try {
      await onAdd(text);
      setDraft('');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await onRemove(id);
    } finally {
      setRemovingId(null);
    }
  };

  const sortedNotes = [...notes].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <SectionCard icon={<IconNote size={14} />} title={t('common.detail.notes.title')} padding="md">
      <Stack gap="sm">
        {canEdit && (
          <Stack gap="xs">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              placeholder={t('common.detail.notes.addPlaceholder')}
              autosize
              minRows={2}
              maxRows={6}
            />
            <Group justify="flex-end">
              <Button
                size="compact-sm"
                leftSection={<IconPlus size={14} />}
                onClick={handleAdd}
                loading={adding}
                disabled={!draft.trim()}
              >
                {t('common.detail.notes.addButton')}
              </Button>
            </Group>
          </Stack>
        )}

        {sortedNotes.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('common.detail.notes.empty')}
          </Text>
        ) : (
          <Stack gap="sm">
            {sortedNotes.map((note) => {
              const displayName = note.createdByName?.trim() || note.createdBy;
              return (
                <Card key={note.id} withBorder padding="sm" radius="md">
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Group
                      gap="sm"
                      wrap="nowrap"
                      align="flex-start"
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <EmployeeAvatar name={displayName} size={28} initialSize="10px" />
                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" c="dimmed">
                          {t('common.detail.notes.byOn', {
                            author: displayName,
                            date: formatDateTime(note.createdAt),
                          })}
                        </Text>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                          {note.text}
                        </Text>
                      </Stack>
                    </Group>
                    {canEdit && (
                      <Tooltip label={t('common.detail.notes.removeAria')} withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          loading={removingId === note.id}
                          onClick={() => handleRemove(note.id)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );
}
