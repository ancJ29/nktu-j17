import { Anchor, type AnchorProps, type MantineColor } from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

type AuthLinkProps = Omit<AnchorProps, 'component'> & {
  children: ReactNode;
  href: string;
  c?: MantineColor;
};

export function AuthLink({ children, href, c, ...props }: AuthLinkProps) {
  return (
    <Anchor component={Link} to={href} size="sm" c={c} {...props}>
      {children}
    </Anchor>
  );
}
