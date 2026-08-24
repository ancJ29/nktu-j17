import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { appConfig } from '@/config';
import { useIsRoot } from '@/hooks/useIsRoot';
import { ForbiddenState } from '@/components/ForbiddenState';
import { LookupV2Page } from './pages';

const showRestrictedItems = appConfig.features?.permissionManagement?.showRestrictedItems ?? false;

export function RootOnly({ children }: { children: ReactNode }) {
  const isRoot = useIsRoot();
  if (!isRoot) {
    return showRestrictedItems ? <ForbiddenState /> : <Navigate to={ROUTES.FORBIDDEN} replace />;
  }
  return <>{children}</>;
}

export function LookupV2PageRootGuarded() {
  return (
    <RootOnly>
      <LookupV2Page />
    </RootOnly>
  );
}
