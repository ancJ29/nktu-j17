import type { MantineColor } from '@mantine/core';
import { Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { Icon } from '../../common/Icon';
import { IconName } from '../../types/icon';
import { AuthLink } from './AuthLink';

type AuthFooterLinkProps = {
  href: string;
  color?: MantineColor;
  children: ReactNode;
  showBackIcon?: boolean;
  prefix?: ReactNode;
};

export function AuthFooterLink({
  href,
  color,
  children,
  showBackIcon = false,
  prefix,
}: AuthFooterLinkProps) {
  return (
    <Text ta="center" mt="xl" size="sm">
      {prefix}
      <AuthLink
        href={href}
        c={color}
        style={showBackIcon ? { display: 'inline-flex', alignItems: 'center', gap: 4 } : undefined}
      >
        {showBackIcon && <Icon name={IconName.ArrowLeft} size={14} />}
        {children}
      </AuthLink>
    </Text>
  );
}
