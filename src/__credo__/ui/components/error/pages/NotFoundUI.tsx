import type { MantineColor } from '@mantine/core';
import { Box, Stack, Text, Title, useMantineTheme } from '@mantine/core';
import { AuthButton, AuthCard, AuthLayout } from '../../auth';
import { Icon } from '../../common/Icon';
import { IconName } from '../../types/icon';
import type { ErrorThemeConfig } from '../types';

type NotFoundUIProps = {
  labels?: {
    title: string;
    message: string;
    goToHomeButton: string;
    goBackLink: string;
  };
  themeConfig: ErrorThemeConfig;
  onGoHome: () => void;
  onGoBack?: () => void;
  showGoBack?: boolean;
  notFoundIconName: IconName;
};

export function NotFoundUI({
  labels,
  themeConfig,
  onGoHome,
  onGoBack,
  showGoBack = true,
  notFoundIconName,
}: NotFoundUIProps) {
  const theme = useMantineTheme();

  const {
    title = '404',
    message = "The page you're looking for doesn't exist or has been moved.",
    goToHomeButton = 'Go to Home',
    goBackLink = 'Go back',
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
              background: `linear-gradient(135deg, ${getColor(themeConfig.card.topGradientStart)}15 0%, ${getColor(themeConfig.card.topGradientEnd)}15 100%)`,
            }}
          >
            <Icon
              name={notFoundIconName}
              size={48}
              color={getColor(themeConfig.card.topGradientStart)}
            />
          </Box>

          <Stack align="center" gap="xs">
            <Title
              order={1}
              ta="center"
              fz={72}
              fw={700}
              style={{
                background: `linear-gradient(135deg, ${getColor(themeConfig.card.topGradientStart)} 0%, ${getColor(themeConfig.card.topGradientEnd)} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1,
              }}
            >
              {title}
            </Title>
            <Text c="neutral.7" ta="center" size="md" maw={300}>
              {message}
            </Text>
          </Stack>

          <Stack w="100%" gap="sm" mt="md">
            <AuthButton
              gradientStart={themeConfig.button.gradientStart}
              gradientEnd={themeConfig.button.gradientEnd}
              onClick={onGoHome}
            >
              {goToHomeButton}
            </AuthButton>

            {showGoBack && onGoBack && (
              <Text
                component="button"
                c={themeConfig.link.color}
                ta="center"
                size="sm"
                onClick={onGoBack}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {goBackLink}
              </Text>
            )}
          </Stack>
        </Stack>
      </AuthCard>
    </AuthLayout>
  );
}
