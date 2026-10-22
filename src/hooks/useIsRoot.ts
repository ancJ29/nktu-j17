import { useAuthStore } from '@/stores/useAuthStore';

export function useIsRoot(): boolean {
  return useAuthStore((s) => s.user?.isRoot ?? false);
}
