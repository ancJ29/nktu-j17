import { useMemo } from 'react';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { findEmployeeByLoginEmail } from '@/utils/loginEmail';
import type { Employee } from '@/types';

export function useMyEmployee(): Employee | undefined {
  const myInformation = useAuthStore((s) => s.user?.myInformation);
  const email = useAuthStore((s) => s.user?.email);
  const employees = useEmployeeStore((s) => s.items);

  return useMemo(() => {
    const id = myInformation?.id;
    if (id) {
      return (employees.find((e) => e.id === id) ?? myInformation) as Employee;
    }

    return email ? findEmployeeByLoginEmail(employees, email) : undefined;
  }, [myInformation, email, employees]);
}
