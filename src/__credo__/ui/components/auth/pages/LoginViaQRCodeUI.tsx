import { Box, Loader, Stack, Text } from '@mantine/core';
import { Icon } from '../../common/Icon';
import { IconName } from '../../types/icon';
import type { AuthThemeConfig, LoginViaQRCodeRoutes } from '../types';
import { AuthError, AuthFooterLink, AuthHeader, AuthPageWrapper, AuthSubtitle } from '../ui';

type LoginViaQRCodeUIProps = {
  labels?: {
    title: string;
    subtitle: string;
    loadingText: string;
    scanText: string;
    qrCodeAlt: string;
    backToLoginLink: string;
  };
  isLoading: boolean;
  qrCode: string | null;
  error: string | null;
  themeConfig: AuthThemeConfig;
  routes: LoginViaQRCodeRoutes;
  qrcodeIconName: IconName;
};

export function LoginViaQRCodeUI({
  labels,
  isLoading,
  qrCode,
  error,
  themeConfig,
  routes,
  qrcodeIconName,
}: LoginViaQRCodeUIProps) {
  const {
    title = 'Login via QR Code',
    subtitle = 'Scan the QR code with your mobile device to login',
    loadingText = 'Generating QR code...',
    scanText = 'Scan with your mobile device',
    qrCodeAlt = 'QR Code',
    backToLoginLink = 'Back to login',
  } = labels ?? {};

  return (
    <AuthPageWrapper layout={themeConfig.layout} card={themeConfig.card}>
      <AuthHeader>{title}</AuthHeader>
      <AuthSubtitle>{subtitle}</AuthSubtitle>

      <AuthError message={error} />

      <Stack align="center" gap="lg">
        <Box
          w={200}
          h={200}
          style={{
            border: '2px dashed var(--mantine-color-gray-4)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isLoading ? (
            <Loader size="lg" />
          ) : qrCode ? (
            <img src={qrCode} alt={qrCodeAlt} width={180} height={180} />
          ) : (
            <Icon name={qrcodeIconName} size={120} color="var(--mantine-color-gray-5)" />
          )}
        </Box>

        <Text c="dimmed" size="xs" ta="center">
          {isLoading ? loadingText : scanText}
        </Text>
      </Stack>

      <AuthFooterLink href={routes.login} color={themeConfig.link.color} showBackIcon>
        {backToLoginLink}
      </AuthFooterLink>
    </AuthPageWrapper>
  );
}
