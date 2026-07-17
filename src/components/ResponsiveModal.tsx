import { Drawer, Modal, rem, ScrollArea } from '@mantine/core';
import type { ReactNode } from 'react';
import { device } from '@credo/base-ui/utils';

const isMobile = device.isMobile;

type ResponsiveModalProps = {
  opened: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  
  size?: string;
  
  drawerHeight?: string;
};

export function ResponsiveModal({
  opened,
  onClose,
  title,
  children,
  size = 'md',
  drawerHeight = '85vh',
}: ResponsiveModalProps) {
  if (isMobile) {
    return (
      <Drawer
        opened={opened}
        onClose={onClose}
        title={title}
        position="bottom"
        size={drawerHeight}
        padding="md"
        styles={{
          content: {
            borderTopLeftRadius: rem(16),
            borderTopRightRadius: rem(16),
            display: 'flex',
            flexDirection: 'column',
          },
          header: {
            borderTopLeftRadius: rem(16),
            borderTopRightRadius: rem(16),
          },
          body: {
            paddingBottom: rem(24),
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <ScrollArea style={{ flex: 1 }} offsetScrollbars>
          {children}
        </ScrollArea>
      </Drawer>
    );
  }

  return (
    <Modal opened={opened} onClose={onClose} title={title} centered size={size}>
      {children}
    </Modal>
  );
}
