import type { AppSettingsDTO } from '@/lib/appSettingsShared';

export interface Permissions {
  stock: {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    craftRead: boolean;
    craftWrite: boolean;
  };
  orders: {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  };
  application: {
    access: boolean;
    management: boolean;
  };
  payrollReports: {
    view: boolean;
    create: boolean;
  };
  weeklyDispensaryActivity: {
    view: boolean;
    editOwn: boolean;
    editAll: boolean;
  };
  stockStatistics: {
    view: boolean;
  };
}

export type AccessibleDispensary = {
  id: string;
  slug: string;
  name: string;
};

export interface PermissionsContextType {
  permissions: Permissions | null;
  userRole: string | null;
  loading: boolean;
  appSettings: AppSettingsDTO;
  dispensarySlug: string | null;
  dispensaryId: string | null;
  accessibleDispensaries: AccessibleDispensary[];
  agendaModuleAccess: boolean;
}
