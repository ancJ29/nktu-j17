import { Tooltip as MantineTooltip, type TooltipProps } from '@mantine/core';
import { device } from '../../utils/device';

export function Tooltip({ children, label, ...props }: TooltipProps) {
  if (device.isMobile) {
    return children;
  }

  return (
    <MantineTooltip label={label} {...props}>
      {children}
    </MantineTooltip>
  );
}
