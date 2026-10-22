import { getDeterministicColor } from '@credo/base-ui/utils';
import { Avatar, Text, type AvatarProps } from '@mantine/core';

export type EmployeeAvatarProps = Omit<AvatarProps, 'src' | 'name' | 'color' | 'children'> & {
  
  readonly name: string | undefined | null;
  
  readonly imageUrl?: string | undefined | null;
  
  readonly initialSize?: string;
  
  readonly initialWeight?: number;
};

function getInitial(name: string | undefined | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/);
  return words[words.length - 1]?.[0]?.toUpperCase() ?? '?';
}

const map = new Map<
  string,
  {
    color: string;
    initial: string;
  }
>();

export function EmployeeAvatar({
  name,
  imageUrl,
  initialSize = '12px',
  initialWeight = 700,
  size = 28,
  radius = 'xl',
  ...rest
}: EmployeeAvatarProps) {
  const safe = name?.trim() ?? '';
  
  
  
  if (!map.has(safe)) {
    const color = safe ? getDeterministicColor(safe) : 'gray';
    const initial = getInitial(safe);
    map.set(safe, { color, initial });
  }

  const { color, initial } = map.get(safe) ?? {
    color: 'gray',
    initial: '?',
  };

  return (
    <Avatar
      src={imageUrl ?? undefined}
      name={safe}
      size={size}
      radius={radius}
      color={color}
      {...rest}
    >
      <Text size={initialSize} fw={initialWeight} lh={1}>
        {initial}
      </Text>
    </Avatar>
  );
}
