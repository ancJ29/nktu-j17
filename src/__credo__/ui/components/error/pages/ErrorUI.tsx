import type { MantineColor } from '@mantine/core';
import { Box, Stack, Text, Title, useMantineTheme } from '@mantine/core';
import { AuthButton, AuthCard, AuthLayout } from '../../auth';
import { Icon } from '../../common/Icon';
import type { IconName } from '../../types';
import type { ErrorThemeConfig } from '../types';

type ErrorUIProps = {
  labels?: {
    title: string;
    message: string;
    tryAgainButton: string;
    goToHomeLink: string;
  };
  themeConfig: ErrorThemeConfig;
  onRetry?: () => void;
  onGoHome: () => void;
  showRetry?: boolean;
  errorIconName: IconName;
};

export function ErrorUI({
  labels,
  themeConfig,
  onRetry,
  onGoHome,
  showRetry = true,
  errorIconName,
}: ErrorUIProps) {
  const theme = useMantineTheme();

  const {
    title = 'Something went wrong',
    message = "We're sorry, an unexpected error occurred. Please try again.",
    tryAgainButton = 'Try Again',
    goToHomeLink = 'Go to Home',
  } = labels ?? {};

  const getColor = (color: MantineColor) => {
    if (typeof color === 'string' && color.includes('.')) {
      const [colorName, shade] = color.split('.');
      return theme.colors[colorName]?.[parseInt(shade)] || color;
    }
    return color;
  };

  return (
    <AuthLayout
      bgGradientStart={themeConfig.layout.bgGradientStart}
      bgGradientEnd={themeConfig.layout.bgGradientEnd}
    >
      <AuthCard
        borderColor={themeConfig.card.borderColor}
        topGradientStart={themeConfig.card.topGradientStart}
        topGradientEnd={themeConfig.card.topGradientEnd}
      >
        <Stack align="center" gap="lg">
          <Box
            p="lg"
            style={{
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${getColor('danger.1')} 0%, ${getColor('danger.2')} 100%)`,
            }}
          >
            <Icon name={errorIconName} size={48} color={getColor('danger.7')} />
          </Box>

          <Stack align="center" gap="xs">
            <Title order={2} ta="center" c="neutral.9" fw={600}>
              {title}
            </Title>
            <Text c="neutral.7" ta="center" size="md" maw={300}>
              {message}
            </Text>
          </Stack>

          <Stack w="100%" gap="sm" mt="md">
            {showRetry && onRetry && (
              <AuthButton
                gradientStart={themeConfig.button.gradientStart}
                gradientEnd={themeConfig.button.gradientEnd}
                onClick={onRetry}
              >
                {tryAgainButton}
              </AuthButton>
            )}

            <Text
              component="button"
              c={themeConfig.link.color}
              ta="center"
              size="sm"
              onClick={onGoHome}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {goToHomeLink}
            </Text>
          </Stack>
        </Stack>
      </AuthCard>
    </AuthLayout>
  );
}
