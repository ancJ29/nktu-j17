import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/useAuthStore';
import { LoadingFallback } from '@credo/base-ui/components';
import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router';

export function GuestLayout() {
  const token = useAuthStore((state) => state.token);

  if (token) {
    return <Navigate to={ROUTES.APP.MAIN} replace />;
  }

  return (
    <Suspense fallback={<LoadingFallback fullScreen />}>
      <Outlet />
    </Suspense>
  );
}
