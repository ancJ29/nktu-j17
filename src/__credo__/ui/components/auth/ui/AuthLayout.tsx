import type { MantineColor } from '@mantine/core';
import { Box, Container, useMantineTheme } from '@mantine/core';
import type { ReactNode } from 'react';
import type { Language } from '../../../types';
import { LanguageSwitcher } from '../../ui/LanguageSwitcher';

type AuthLayoutProps = {
  children: ReactNode;
  bgGradientStart: MantineColor;
  bgGradientEnd: MantineColor;
  languageSwitcher?: {
    languages: Language[];
    currentLanguage: string;
    onLanguageChange: (languageCode: string) => void;
    tooltipLabel?: string;
  };
};

export function AuthLayout({
  children,
  bgGradientStart,
  bgGradientEnd,
  languageSwitcher,
}: AuthLayoutProps) {
  const theme = useMantineTheme();

  const getColor = (color: MantineColor) => {
    if (typeof color === 'string' && color.includes('.')) {
      const [colorName, shade] = color.split('.');
      return theme.colors[colorName]?.[parseInt(shade)] || color;
    }
    return color;
  };

  const gradientStart = getColor(bgGradientStart);
  const gradientEnd = getColor(bgGradientEnd);

  return (
    <Box
      pos="relative"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
      }}
    >
      {languageSwitcher && (
        <Box pos="absolute" top={16} right={16}>
          <LanguageSwitcher
            languages={languageSwitcher.languages}
            currentLanguage={languageSwitcher.currentLanguage}
            onLanguageChange={languageSwitcher.onLanguageChange}
            tooltipLabel={languageSwitcher.tooltipLabel}
          />
        </Box>
      )}

      <Container miw={{ lg: '500px' }} px="sm">
        {children}
      </Container>
    </Box>
  );
}
