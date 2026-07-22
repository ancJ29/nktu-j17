import { ROUTES } from '@/constants/routes';
import { LoadingFallback } from '@credo/base-ui/components';
import { useAuthStore } from '@/stores/useAuthStore';
import { cacheFlush } from '@/utils/appCache';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export function LogoutPage() {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    logout('user');
    sessionStorage.clear();
    
    
    cacheFlush();
    navigate(ROUTES.AUTH.LOGIN);
  }, [logout, navigate]);

  return <LoadingFallback fullScreen />;
}
