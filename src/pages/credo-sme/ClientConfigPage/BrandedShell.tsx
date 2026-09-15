import { AppBrandName } from '@credo/base-ui/components';
import { Anchor, Badge, Box, Button, Container, Group } from '@mantine/core';
import { IconLogout } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { appBrand, appConfig, themeConfig } from '@/config';

export function BrandedShell({
  authed,
  onSignOut,
  children,
}: {
  authed: boolean;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const mainColor = themeConfig.mainColor;
  const headerBg = `var(--mantine-color-${mainColor}-9)`;
  const logoUrl = appConfig.app.logoDarkBgUrl || appConfig.app.logoUrl || '/logo-white.svg';

  return (
    <Box mih="100vh" bg="var(--mantine-color-gray-0)">
      <Box bg={headerBg} c="white" h={56}>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Box
                component="img"
                src={logoUrl}
                alt=""
                h={28}
                w={28}
                style={{ objectFit: 'contain' }}
              />
              <AppBrandName {...appBrand} fw={700} size="lg" />
              {/* Names the BFF, not the page. Two operator screens now reach
                  the same register through two different services, and which
                  one you are on is the only thing that matters when they
                  disagree. */}
              <Badge size="sm" color="grape" variant="filled" tt="uppercase">
                credo-sme
              </Badge>
            </Group>
            {authed ? (
              <Button
                size="compact-sm"
                variant="white"
                color={mainColor}
                leftSection={<IconLogout size={14} />}
                onClick={onSignOut}
              >
                Sign out
              </Button>
            ) : (
              <Anchor href="/" c="white" size="sm" underline="hover">
                Exit
              </Anchor>
            )}
          </Group>
        </Container>
      </Box>

      <Container size="xl" py="xl">
        {children}
      </Container>
    </Box>
  );
}
