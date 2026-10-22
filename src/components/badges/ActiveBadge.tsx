import { Badge, type BadgeProps, type MantineColor } from '@mantine/core';

type ActiveBadgeProps = {
  readonly isActive: boolean;
  readonly activeLabel: string;
  readonly inactiveLabel: string;
  readonly c?: MantineColor;
} & Omit<BadgeProps, 'color' | 'variant' | 'children'>;

const ACTIVE_COLOR = 'primary.7';
const INACTIVE_COLOR = 'neutral.5';

export function ActiveBadge({
  isActive,
  activeLabel,
  inactiveLabel,
  size = 'sm',
  ...props
}: ActiveBadgeProps) {
  return (
    <Badge variant="filled" color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR} size={size} {...props}>
      {isActive ? activeLabel : inactiveLabel}
    </Badge>
  );
}
