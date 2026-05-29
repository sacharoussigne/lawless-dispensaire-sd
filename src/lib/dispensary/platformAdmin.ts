import { hasRole } from '@/lib/auth/permissions';
import { Role } from '@/types/enum/roles';

export function isPlatformAdmin(role: string | null | undefined): boolean {
  return hasRole(role, Role.ADMIN);
}
