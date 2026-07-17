import { useState } from 'react';
import { Affix, Center, Text, Space, Button } from '@mantine/core';
import { device } from '@credo/base-ui/utils';

const isMobile = device.isMobile;

export function InternalBanner() {
  const [hide, setHide] = useState(false);

  if (hide) return null;

  if (isMobile) {
    return (
      <Affix position={{ top: 0, right: 0 }}>
        <Text c="red.5" fw="bold" fz="xs" m={0} p={2} fs="italic">
          Internal
        </Text>
      </Affix>
    );
  }
  return (
    <Affix position={{ top: 10, left: '20%' }}>
      <Center w="50vw" p={0}>
        <Text c="black" ta="center" fw={600} p="xs" bg="yellow.4">
          Internal deployment. For development and evaluation use only.
          {/* DO NOT USE IN PRODUCTION. */}
        </Text>
        <Space w="md" />
        <Button variant="light" onClick={() => setHide(true)}>
          Hide me
        </Button>
      </Center>
    </Affix>
  );
}
