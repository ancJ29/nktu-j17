import type { MantineColor } from '@mantine/core';
import type { ReactNode } from 'react';
import type { Language } from '../../../types';
import type { AuthBranding } from '../types';
import { AuthCard } from './AuthCard';
import { AuthLayout } from './AuthLayout';

type AuthPageWrapperProps = {
  children: ReactNode;
  layout: {
    bgGradientStart: MantineColor;
    bgGradientEnd: MantineColor;
  };
  card: {
    borderColor: MantineColor;
    topGradientStart: MantineColor;
    topGradientEnd: MantineColor;
  };
  branding?: AuthBranding;
  languageSwitcher?: {
    languages: Language[];
    currentLanguage: string;
    onLanguageChange: (languageCode: string) => void;
    tooltipLabel?: string;
  };
};

export function AuthPageWrapper({
  children,
  layout,
  card,
  branding,
  languageSwitcher,
}: AuthPageWrapperProps) {
  return (
    <AuthLayout
      bgGradientStart={layout.bgGradientStart}
      bgGradientEnd={layout.bgGradientEnd}
      languageSwitcher={languageSwitcher}
    >
      <AuthCard
        borderColor={card.borderColor}
        topGradientStart={card.topGradientStart}
        topGradientEnd={card.topGradientEnd}
        branding={branding}
      >
        {children}
      </AuthCard>
    </AuthLayout>
  );
}
