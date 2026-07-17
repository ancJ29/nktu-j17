import { Badge, type BadgeProps, type MantineColor } from '@mantine/core';

type ActiveBadgeProps = {
  readonly isActive: boolean;
  readonly activeLabel: string;
  readonly inactiveLabel: string;
  readonly c?: MantineColor;
} & Omit<BadgeProps, 'color' | 'variant' | 'children'>;

export function ActiveBadge({
  isActive,
  activeLabel,
  inactiveLabel,
  size = 'sm',
  c,
  ...props
}: ActiveBadgeProps) {
  const color = c ?? (isActive ? '#42883E' : 'gray.5');

  return (
    <Badge variant="filled" color={color} size={size} {...props}>
      {isActive ? activeLabel : inactiveLabel}
    </Badge>
  );
}
