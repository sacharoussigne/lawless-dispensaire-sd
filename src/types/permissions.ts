import type { AppSettingsDTO } from '@/lib/appSettingsShared';

export interface Permissions {
  // Stock permissions
  stock: {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    craftRead: boolean;
    craftWrite: boolean;
  };
  // Orders permissions
  orders: {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  };
  // Application permissions
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

export interface PermissionsContextType {
  permissions: Permissions | null;
  userRole: string | null;
  loading: boolean;
  appSettings: AppSettingsDTO;
}

