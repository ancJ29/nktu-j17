import type { MantineColor } from '@mantine/core';
import { Box, Group, Image, Paper, Stack, Text, useMantineTheme } from '@mantine/core';
import { type ReactNode, useCallback, useState } from 'react';
import { AppBrandName } from '../../app/AppBrandName';
import type { AuthBranding } from '../types';

type AuthCardProps = {
  children: ReactNode;
  borderColor: MantineColor;
  topGradientStart: MantineColor;
  topGradientEnd: MantineColor;
  branding?: AuthBranding;
};

export function AuthCard({
  children,
  borderColor,
  topGradientStart,
  topGradientEnd,
  branding,
}: AuthCardProps) {
  const theme = useMantineTheme();

  const getColor = (color: MantineColor) => {
    if (typeof color === 'string' && color.includes('.')) {
      const [colorName, shade] = color.split('.');
      return theme.colors[colorName]?.[parseInt(shade)] || color;
    }
    return color;
  };

  const resolvedBorderColor = getColor(borderColor);
  const gradientStart = getColor(topGradientStart);
  const gradientEnd = getColor(topGradientEnd);
  const hasBranding =
    branding &&
    (branding.logoUrl || branding.appName || branding.appNameHtml || branding.description);

  return (
    <Paper
      shadow="xl"
      radius="md"
      pos="relative"
      style={{
        border: `1px solid ${resolvedBorderColor}`,
        overflow: 'hidden',
      }}
    >
      {/* Top accent bar */}
      <Box
        h={4}
        style={{
          background: `linear-gradient(90deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
        }}
      />

      {/* Branding header */}
      {hasBranding && <CardBrandingHeader branding={branding} />}

      {/* Form content */}
      <Box p={40} pt={hasBranding ? 28 : 40}>
        {children}
      </Box>
    </Paper>
  );
}

function CardBrandingHeader({ branding }: { branding: AuthBranding }) {
  const [logoError, setLogoError] = useState(false);
  const handleLogoError = useCallback(() => setLogoError(true), []);

  const showLogo = branding.logoUrl && !logoError;

  return (
    <Box px={40} pt={28} pb={0} bg="primary.0">
      <Group gap="md" justify="center" align="center" wrap="nowrap">
        {showLogo && (
          <Box
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              overflow: 'hidden',
              flexShrink: 0,
            }}
            bd="1px solid var(--mantine-color-primary-2)"
          >
            <Image
              src={branding.logoUrl}
              alt={branding.appName ?? ''}
              h={44}
              w={44}
              fit="contain"
              onError={handleLogoError}
            />
          </Box>
        )}
        <Stack gap={2}>
          <AppBrandName
            name={branding.appName ?? ''}
            nameHtml={branding.appNameHtml}
            fw={700}
            size="md"
            lh={1.2}
          />
          {branding.description && (
            <Text size="xs" c="dimmed" lh={1.3}>
              {branding.description}
            </Text>
          )}
        </Stack>
      </Group>

      {/* Separator */}
      <Box mt="md" h={1} bg="primary.1" />
    </Box>
  );
}
