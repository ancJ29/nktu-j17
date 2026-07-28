import { Badge, Button, Container, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconLogin, IconTool } from '@tabler/icons-react';
import { Link, Navigate } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { useRootFirstRunRedirect } from '@/hooks/useRootFirstRunRedirect';

export default function HomePage() {
  const onboardingRedirect = useRootFirstRunRedirect();
  if (onboardingRedirect) return <Navigate to={onboardingRedirect} replace />;

  return (
    <Container size="sm" py="xl" h="100vh">
      <Stack gap="xl">
        <Stack gap="xs" ta="center">
          <Title order={2}>C-Mngt</Title>
          <Text c="dimmed" size="sm">
            Management System
          </Text>
          <Group justify="center" gap="xs">
            <Badge variant="light" size="sm">
              PWA
            </Badge>
            <Badge variant="light" size="sm" color="green">
              Online
            </Badge>
          </Group>
        </Stack>

        <Stack align="center" gap="sm" py="xl">
          <ThemeIcon size={64} radius="xl" variant="light" color="gray">
            <IconTool size={32} stroke={1.5} />
          </ThemeIcon>
          <Text fw={600} size="lg">
            Coming Soon
          </Text>
          <Text size="sm" c="dimmed" ta="center" maw={360}>
            We're putting the finishing touches on this page. Please check back later.
          </Text>
        </Stack>

        <Button
          component={Link}
          to={ROUTES.AUTH.LOGOUT}
          variant="light"
          leftSection={<IconLogin size={16} />}
        >
          Logout
        </Button>

        <Text ta="center" size="xs" c="dimmed">
          v1.1.0
        </Text>
      </Stack>
    </Container>
  );
}
