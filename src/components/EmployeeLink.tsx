import { useMemo } from 'react';
import { ROUTES } from '@/constants/routes';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { EntityAnchor, EntityChip, EntityDash, JoinedLinks, type LinkSize } from './EntityLink';

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
  size?: LinkSize;
  noAvatar?: boolean;
};

type EmployeeLinksProps = {
  codes?: string[];

  ids?: string[];
  size?: LinkSize;
};

export function EmployeeLink({ code, id, noAvatar = false, size = 'sm' }: EmployeeLinkProps) {
  const employee = useEmployeeStore((s) =>
    code ? s.getByCode(code) : id ? s.getById(id) : undefined,
  );

  const name = employee?.name ?? '';

  const detailId = employee?.id ?? (code ? undefined : (id ?? undefined));

  if (!name || !detailId) return <EntityDash size={size} />;

  return (
    <EntityAnchor to={ROUTES.EMPLOYEES.DETAIL.replace(':id', detailId)} size={size}>
      <EntityChip
        size={size}
        lead={
          noAvatar ? undefined : (
            <AvatarLead size={size} imageUrl={employee?.extra?.profileImage} name={name} />
          )
        }
        label={name}
      />
    </EntityAnchor>
  );
}

export function EmployeeLinks({ codes, ids, size = 'sm' }: EmployeeLinksProps) {
  const getByCode = useEmployeeStore((s) => s.getByCode);
  const getById = useEmployeeStore((s) => s.getById);

  useEmployeeStore((s) => s.items);

  const resolved = useMemo(() => {
    const useCodes = codes && codes.length > 0;
    const keys = useCodes ? codes! : (ids ?? []);
    return keys.map((key) => {
      const emp = useCodes ? getByCode(key) : getById(key);
      return {
        detailId: emp?.id ?? (useCodes ? undefined : key),
        name: emp?.name ?? key,
        profileImage: emp?.extra?.profileImage,
        key,
      };
    });
  }, [codes, ids, getByCode, getById]);

  return (
    <JoinedLinks
      size={size}
      items={resolved}
      keyOf={(emp) => emp.key}
      renderItem={(emp) => {
        const chip = (
          <EntityChip
            size={size}
            lead={<AvatarLead size={size} imageUrl={emp.profileImage} name={emp.name} />}
            label={emp.name}
          />
        );
        return emp.detailId ? (
          <EntityAnchor to={ROUTES.EMPLOYEES.DETAIL.replace(':id', emp.detailId)} size={size}>
            {chip}
          </EntityAnchor>
        ) : (
          chip
        );
      }}
    />
  );
}
