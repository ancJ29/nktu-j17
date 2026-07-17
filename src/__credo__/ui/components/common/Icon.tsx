import { ICON_MAP, IconName } from '../types/icon';

type IconProps = {
  name: IconName;
  className?: string;
  size?: string | number;
  color?: string;
  stroke?: number;
  style?: React.CSSProperties;
};

export function Icon({ name, className, size, color, stroke, style }: IconProps) {
  if (name in ICON_MAP) {
    const IconComponent = ICON_MAP[name];
    return (
      <IconComponent
        className={className}
        size={size}
        color={color}
        stroke={stroke}
        style={style}
      />
    );
  }
  return null;
}
