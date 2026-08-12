import { ROUTES } from '@/constants/routes';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { EntityAnchor, EntityChip, EntityDash, type LinkSize } from './EntityLink';

const AVATAR_SIZE: Record<LinkSize, number> = { xs: 16, sm: 18, md: 22 };
const INITIAL_SIZE: Record<LinkSize, string> = { xs: '9px', sm: '10px', md: '12px' };

function AvatarLead({ size, imageUrl, name }: { size: LinkSize; imageUrl?: string; name: string }) {
  return (
    <EmployeeAvatar
      name={name}
      imageUrl={imageUrl}
      size={AVATAR_SIZE[size]}
      initialSize={INITIAL_SIZE[size]}
      style={{ flexShrink: 0 }}
    />
  );
}

type EmployeeLinkProps = {
  code?: string | undefined | null;
  id?: string | undefined | null;

  fallbackLabel?: string | null;
  size?: LinkSize;
  noAvatar?: boolean;
};

export function EmployeeLink({
  code,
  id,
  fallbackLabel,
  noAvatar = false,
  size = 'sm',
}: EmployeeLinkProps) {
  const employee = useEmployeeStore((s) =>
    code ? s.getByCode(code) : id ? s.getById(id) : undefined,
  );

  const name = employee?.name ?? fallbackLabel ?? '';

  const detailId = employee?.id ?? (code ? undefined : (id ?? undefined));

  if (!name) return <EntityDash size={size} />;

  const chip = (
    <EntityChip
      size={size}
      lead={
        noAvatar ? undefined : (
          <AvatarLead size={size} imageUrl={employee?.extra?.profileImage} name={name} />
        )
      }
      label={name}
    />
  );

  if (!detailId) return chip;

  return (
    <EntityAnchor to={ROUTES.EMPLOYEES.DETAIL.replace(':id', detailId)} size={size}>
      {chip}
    </EntityAnchor>
  );
}
