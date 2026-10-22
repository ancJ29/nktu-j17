import { ROUTES } from '@/constants/routes';
import { isSignedIn } from '@/stores/useAuthStore';
import { LoadingFallback } from '@credo/base-ui/components';
import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router';

export function GuestLayout() {
  if (isSignedIn()) {
    return <Navigate to={ROUTES.APP.MAIN} replace />;
  }

  return (
    <Suspense fallback={<LoadingFallback fullScreen />}>
      <Outlet />
    </Suspense>
  );
}
