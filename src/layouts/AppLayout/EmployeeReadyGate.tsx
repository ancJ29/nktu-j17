import type { ReactNode } from 'react';
import { LoadingFallback } from '@credo/base-ui/components';
import { useEmpReady } from '@/utils/bootState';

export function EmployeeReadyGate({ children }: { children: ReactNode }) {
  const ready = useEmpReady();
  return ready ? <>{children}</> : <LoadingFallback fullScreen />;
}
