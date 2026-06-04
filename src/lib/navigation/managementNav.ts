import type { AppSettingsDTO } from '@/lib/appSettingsShared';
import type { Permissions } from '@/types/permissions';
import type { tenantRoutes } from '@/types/routes';

export type ManagementNavItem = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
};

export function getManagementNavItems(
  t: ReturnType<typeof tenantRoutes>,
  appSettings: AppSettingsDTO,
  permissions: Permissions | null,
): ManagementNavItem[] {
  return [
    {
      id: 'payroll',
      label: 'Rapports salaires',
      href: t.employee.payroll,
      visible:
        appSettings.featurePayrollEnabled && (permissions?.payrollReports.view ?? false),
    },
    {
      id: 'stockStatistics',
      label: 'Statistiques de stock',
      href: t.employee.stockStatistics,
      visible:
        appSettings.featureStockEnabled && (permissions?.stockStatistics.view ?? false),
    },
    {
      id: 'categoryItems',
      label: "Catégories d'objets",
      href: t.management.categoryItems,
      visible: true,
    },
    {
      id: 'items',
      label: 'Objets',
      href: t.management.items,
      visible: true,
    },
    {
      id: 'chests',
      label: 'Coffres',
      href: t.management.chests,
      visible: true,
    },
    {
      id: 'companyGroups',
      label: "Groupes d'entreprises",
      href: t.management.companyGroups,
      visible: true,
    },
    {
      id: 'companies',
      label: 'Entreprises',
      href: t.management.companies,
      visible: true,
    },
    {
      id: 'mails',
      label: 'Courriers',
      href: t.management.mails,
      visible: appSettings.featureMailsEnabled,
    },
  ].filter((item) => item.visible);
}
