import { ActionIcon, Menu, Text } from '@mantine/core';
import type { Language } from '../../types';
import { Icon, Tooltip } from '../common';
import { IconName } from '../types';

type LanguageSwitcherProps = {
  
  languages: Language[];
  
  currentLanguage: string;
  
  onLanguageChange: (languageCode: string) => void;
  
  tooltipLabel?: string;
  
  size?: number;
  
  lightIcon?: boolean;
};

export function LanguageSwitcher({
  languages,
  currentLanguage,
  onLanguageChange,
  tooltipLabel = 'Language',
  size = 20,
  lightIcon = false,
}: LanguageSwitcherProps) {
  if (languages.length === 1) {
    return null;
  }

  const iconColor = lightIcon ? 'white' : undefined;

  return (
    <Menu position="bottom-end" width={160} shadow="md" offset={8}>
      <Menu.Target>
        <Tooltip label={tooltipLabel} position="bottom">
          <ActionIcon
            variant="subtle"
            size="lg"
            aria-label={tooltipLabel}
            style={{
              backgroundColor: lightIcon ? 'rgba(255, 255, 255, 0.12)' : undefined,
            }}
          >
            <Icon name={IconName.Language} size={size} color={iconColor} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        {languages.map((lang) => (
          <Menu.Item
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            leftSection={<Text size="sm">{lang.flag}</Text>}
            bg={lang.code === currentLanguage ? 'var(--mantine-color-default-hover)' : undefined}
          >
            <Text size="sm" fw={lang.code === currentLanguage ? 600 : 400}>
              {lang.label}
            </Text>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
