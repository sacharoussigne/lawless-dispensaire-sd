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
): ManagementNavItem[] {
  return [
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
