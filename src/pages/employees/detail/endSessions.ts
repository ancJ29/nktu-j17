import type { Employee } from '@/types';

export const endSessionsPatch = (employee: Employee | null, now: number): Partial<Employee> => ({
  extra: { ...employee?.extra, sessionsEndedAt: now },
});
