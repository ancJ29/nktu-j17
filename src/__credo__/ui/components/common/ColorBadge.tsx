import { getDeterministicColor } from '../../utils/color';
import { Badge, type BadgeProps } from '@mantine/core';

type ColorBadgeProps = {
  readonly label?: string | null | undefined;
  readonly color?: string | null | undefined;
} & Omit<BadgeProps, 'color' | 'variant' | 'radius' | 'tt'>;

export function ColorBadge({ label, color, ...props }: ColorBadgeProps) {
  if (!label) return null;
  return (
    <Badge
      variant={'filled'}
      bg={color ?? getDeterministicColor(label)}
      radius="sm"
      tt="capitalize"
      {...props}
    >
      {label}
    </Badge>
  );
}
