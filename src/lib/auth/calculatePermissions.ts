import { checkRolePermission } from './permissions';
import type { Permissions } from '@/types/permissions';

/**
 * Calcule toutes les permissions pour un rôle donné
 * @param role Le rôle de l'utilisateur
 * @returns Les permissions calculées ou null si pas de rôle
 */
export function calculatePermissions(role: string | null | undefined): Permissions | null {
  if (!role) {
    return null;
  }

  return {
    stock: {
      view: checkRolePermission(role, 'stock', 'view'),
      create: checkRolePermission(role, 'stock', 'create'),
      update: checkRolePermission(role, 'stock', 'update'),
      delete: checkRolePermission(role, 'stock', 'delete'),
      craftRead: checkRolePermission(role, 'stock', 'craft-read'),
      craftWrite: checkRolePermission(role, 'stock', 'craft-write'),
    },
    orders: {
      view: checkRolePermission(role, 'orders', 'view'),
      create: checkRolePermission(role, 'orders', 'create'),
      update: checkRolePermission(role, 'orders', 'update'),
      delete: checkRolePermission(role, 'orders', 'delete'),
    },
    application: {
      access: checkRolePermission(role, 'application', 'access'),
      management: checkRolePermission(role, 'application', 'management'),
    },
    payrollReports: {
      view: checkRolePermission(role, 'payroll_reports', 'view'),
      create: checkRolePermission(role, 'payroll_reports', 'create'),
    },
    weeklyDispensaryActivity: {
      view: checkRolePermission(role, 'weekly_dispensary_activity', 'view'),
      editOwn: checkRolePermission(role, 'weekly_dispensary_activity', 'edit_own'),
      editAll: checkRolePermission(role, 'weekly_dispensary_activity', 'edit_all'),
    },
  };
}

