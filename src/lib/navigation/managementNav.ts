import type { Icon } from '@tabler/icons-react';
import {
  IconBuildingSkyscraper,
  IconCategory2,
  IconClipboardText,
  IconInbox,
  IconLayoutGrid,
  IconUsersGroup,
} from '@tabler/icons-react';
import type { AppSettingsDTO } from '@/lib/appSettingsShared';
import type { tenantRoutes } from '@/types/routes';

export type ManagementNavId =
| 'categoryItems'
  | 'items'
  | 'companyGroups'
  | 'companies'
  | 'chests'
  | 'mails';

export type ManagementNavItem = {
  id: ManagementNavId;
  label: string;
  shortLabel: string;
  href: string;
  icon: Icon;
  /** Lower = shown in primary bar first (max 4) */
  navOrder: number;
  iconOnly?: boolean;
};

const PRIMARY_SLOT_COUNT = 4;

function isItemVisible(id: ManagementNavId, appSettings: AppSettingsDTO): boolean {
  if (id === 'mails') {
    return appSettings.featureMailsEnabled;
  }
  return true;
}

function buildAllItems(t: ReturnType<typeof tenantRoutes>): ManagementNavItem[] {
  return [
    {
      id: 'categoryItems',
      label: "Catégories d'objets",
      shortLabel: 'Catégories',
      href: t.management.categoryItems,
      icon: IconCategory2,
      navOrder: 1,
    },
    {
      id: 'items',
      label: 'Objets',
      shortLabel: 'Objets',
      href: t.management.items,
      icon: IconLayoutGrid,
      navOrder: 2,
    },
    {
      id: 'companyGroups',
      label: "Groupes d'entreprises",
      shortLabel: 'Groupes',
      href: t.management.companyGroups,
      icon: IconUsersGroup,
      navOrder: 3,
    },
    {
      id: 'companies',
      label: 'Entreprises',
      shortLabel: 'Entreprises',
      href: t.management.companies,
      icon: IconBuildingSkyscraper,
      navOrder: 4,
    },
    {
      id: 'chests',
      label: 'Coffres',
      shortLabel: 'Coffres',
      href: t.management.chests,
      icon: IconInbox,
      navOrder: 10,
    },
    {
      id: 'mails',
      label: 'Courriers',
      shortLabel: 'Courriers',
      href: t.management.mails,
      icon: IconClipboardText,
      navOrder: 11,
    },
  ];
}

export function getManagementNavItems(
  t: ReturnType<typeof tenantRoutes>,
  appSettings: AppSettingsDTO,
): { primary: ManagementNavItem[]; more: ManagementNavItem[] } {
  const visible = buildAllItems(t)
    .filter((item) => isItemVisible(item.id, appSettings))
    .sort((a, b) => a.navOrder - b.navOrder);

  const primary = visible.slice(0, PRIMARY_SLOT_COUNT);
  const primaryIds = new Set(primary.map((i) => i.id));
  const more = visible.filter((i) => !primaryIds.has(i.id));

  return { primary, more };
}
