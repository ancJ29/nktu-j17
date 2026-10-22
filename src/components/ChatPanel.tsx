import { ActionIcon, Group, ScrollArea, Stack, Text, Textarea } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/utils/dateFormat';
import { device } from '@credo/base-ui/utils';
import type { DateTimeInput } from '@credo/kits/types';

const isMobile = device.isMobile;
const BOTTOM_OFFSET = isMobile ? 120 : 16;

export type ChatEntry = {
  timestamp: DateTimeInput;
  userId?: string;
  userName?: string;
  message: string;
};

type ChatPanelProps = {
  
  messages: ChatEntry[];
  
  currentUserId?: string;
  
  onSend: (message: string) => Promise<void>;
};

export function ChatPanel({ messages, currentUserId, onSend }: ChatPanelProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [containerHeight, setContainerHeight] = useState<string>('calc(100dvh - 200px)');

  
  const updateHeight = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.top > 0) {
      const h = Math.max(300, window.innerHeight - rect.top - BOTTOM_OFFSET);
      setContainerHeight(`${h}px`);
    }
  }, []);

  
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    
    updateHeight();
    const t1 = setTimeout(updateHeight, 100);
    const t2 = setTimeout(updateHeight, 300);

    
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);

    window.addEventListener('resize', updateHeight);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [updateHeight]);

  
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages.length]);

  
  useEffect(() => {
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await onSend(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Stack
      ref={containerRef}
      gap={0}
      style={{
        height: containerHeight,
        minHeight: 300,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Messages */}
      <ScrollArea style={{ flex: 1, minHeight: 0 }} viewportRef={viewportRef}>
        <Stack gap="xs" p="md">
          {messages.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="md">
              {t('chat.empty')}
            </Text>
          ) : (
            messages.map((msg, idx) => {
              const isMe = currentUserId && msg.userId === currentUserId;
              return (
                <Group
                  key={idx}
                  justify={isMe ? 'flex-end' : 'flex-start'}
                  wrap="nowrap"
                  align="flex-end"
                  gap="xs"
                >
                  <Stack
                    gap={2}
                    style={{
                      maxWidth: '75%',
                      padding: '8px 12px',
                      borderRadius: 'var(--mantine-radius-md)',
                      backgroundColor: isMe
                        ? 'var(--mantine-color-blue-light)'
                        : 'var(--mantine-color-gray-1)',
                    }}
                  >
                    {!isMe && msg.userName && (
                      <Text size="xs" fw={600} c="blue">
                        {msg.userName}
                      </Text>
                    )}
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.message}
                    </Text>
                    <Text size="xs" c="dimmed" ta="right" ff="monospace">
                      {formatDateTime(msg.timestamp)}
                    </Text>
                  </Stack>
                </Group>
              );
            })
          )}
        </Stack>
      </ScrollArea>

      {/* Input bar — pinned at bottom */}
      <Group gap="xs" wrap="nowrap" align="flex-end" p="md" pt="xs" style={{ flexShrink: 0 }}>
        <Textarea
          ref={inputRef}
          placeholder={t('chat.placeholder')}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          autosize
          minRows={1}
          maxRows={4}
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          onFocus={() => {
            if (isMobile) {
              setTimeout(() => {
                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }, 300);
            }
          }}
        />
        <ActionIcon
          size="lg"
          variant="filled"
          onClick={handleSend}
          loading={sending}
          disabled={!text.trim()}
        >
          <IconSend size={16} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}
