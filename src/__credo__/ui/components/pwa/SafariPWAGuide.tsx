import { useEffect, useState } from 'react';

import {
  Button,
  CloseButton,
  Group,
  List,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  useMantineTheme,
} from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import {
  IconCheckbox,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconShare,
  IconSquareRoundedPlus,
} from '@tabler/icons-react';

import { FLOATING_PANEL_STYLE, isIOS, isMacOS, isSafari, isStandalone } from './styles';

export type SafariPWAGuideLabels = {
  installTitle: string;
  installDescription: string;
  remindLater: string;
  dontShowAgain: string;
  iosStep1: string;
  iosStep2: string;
  iosStep3: string;
  macStep1: string;
  macStep2: string;
  macStep3: string;
};

export type SafariPWAGuideProps = {
  color?: string;
  labels?: Partial<SafariPWAGuideLabels>;
};

export function SafariPWAGuide({ color, labels }: SafariPWAGuideProps) {
  const theme = useMantineTheme();
  const c = color ?? theme.primaryColor;

  const {
    installTitle = 'Install App',
    installDescription = 'Install this app for a better experience',
    remindLater = 'Remind Later',
    dontShowAgain = "Don't Show Again",
    iosStep1 = 'Tap the Share button',
    iosStep2 = 'Tap "Add to Home Screen"',
    iosStep3 = 'Tap "Add" to confirm',
    macStep1 = 'Click the Share button in the toolbar',
    macStep2 = 'Click "Add to Dock"',
    macStep3 = 'Click "Add" to confirm',
  } = labels ?? {};

  const [showGuide, setShowGuide] = useState(false);
  const [dismissed, setDismissed] = useLocalStorage({
    key: 'safari-pwa-guide-dismissed',
    defaultValue: false,
  });

  useEffect(() => {
    if (isSafari() && !isStandalone() && !dismissed) {
      const timer = setTimeout(() => setShowGuide(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  useEffect(() => {
    const handleToggle = () => {
      if (isSafari() && !isStandalone()) {
        setShowGuide((prev) => !prev);
      }
    };
    window.addEventListener('toggle-pwa-guide', handleToggle);
    return () => window.removeEventListener('toggle-pwa-guide', handleToggle);
  }, []);

  const handleDismiss = () => setShowGuide(false);
  const handleDismissPermanently = () => {
    setDismissed(true);
    setShowGuide(false);
  };

  if (!showGuide) return null;

  const isIOSDevice = isIOS();
  const isMacDevice = isMacOS();

  const iosSteps = [iosStep1, iosStep2, iosStep3];
  const macSteps = [macStep1, macStep2, macStep3];

  return (
    <Paper shadow="md" p="md" radius="md" style={FLOATING_PANEL_STYLE}>
      <Group align="start" mb="sm">
        <div style={{ flex: 1 }}>
          <Group gap="xs" mb={4}>
            {isIOSDevice ? <IconDeviceMobile size={20} /> : <IconDeviceDesktop size={20} />}
            <Text size="sm" fw={500}>
              {installTitle}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {installDescription}
          </Text>
        </div>
        <CloseButton size="sm" onClick={handleDismiss} />
      </Group>

      <Stack gap="xs">
        {isIOSDevice ? (
          <IOSSteps color={c} steps={iosSteps} />
        ) : isMacDevice ? (
          <MacSteps color={c} steps={macSteps} />
        ) : null}
      </Stack>

      <Group mt="md">
        <Button size="xs" variant="light" color={c} onClick={handleDismiss}>
          {remindLater}
        </Button>
        <Button size="xs" variant="subtle" color={c} onClick={handleDismissPermanently}>
          {dontShowAgain}
        </Button>
      </Group>
    </Paper>
  );
}

function StepIcon({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <ThemeIcon color={color} size={20} radius="xl">
      {children}
    </ThemeIcon>
  );
}

const iosIcons = [IconShare, IconSquareRoundedPlus, IconCheckbox];

function IOSSteps({ color, steps }: { color: string; steps: string[] }) {
  return (
    <List spacing="xs" size="xs" center>
      {steps.map((step, i) => {
        const StepIconComponent = iosIcons[i];
        return (
          <List.Item
            key={i}
            icon={
              <StepIcon color={color}>
                <StepIconComponent size={12} />
              </StepIcon>
            }
          >
            {step}
          </List.Item>
        );
      })}
    </List>
  );
}

function MacSteps({ color, steps }: { color: string; steps: string[] }) {
  return (
    <List spacing="xs" size="xs" center>
      {steps.map((step, i) => (
        <List.Item
          key={i}
          icon={
            <StepIcon color={color}>
              <Text size="xs" fw={700}>
                {i + 1}
              </Text>
            </StepIcon>
          }
        >
          {step}
        </List.Item>
      ))}
    </List>
  );
}
