import type { Icon } from '@tabler/icons-react';
import {
  IconAbacus,
  IconArchive,
  IconCalendarWeek,
  IconCashRegister,
  IconMail,
  IconNotebook,
  IconReportMoney,
  IconSearch,
  IconStethoscope,
} from '@tabler/icons-react';
import type { AppSettingsDTO } from '@/lib/appSettingsShared';
import { checkRolePermission } from '@/lib/auth/permissions';
import type { Permissions } from '@/types/permissions';
import type { tenantRoutes } from '@/types/routes';

export type EmployeeNavId =
  | 'stock'
  | 'orders'
  | 'bank'
  | 'privatePractice'
  | 'weeklyActivity'
  | 'payroll'
  | 'stockStatistics'
  | 'mails'
  | 'search';

export type EmployeeNavItem = {
  id: EmployeeNavId;
  label: string;
  shortLabel: string;
  href: string;
  icon: Icon;
  /** Lower = shown in primary bar first (max 4) */
  navOrder: number;
  iconOnly?: boolean;
};

export type EmployeeNavContext = {
  t: ReturnType<typeof tenantRoutes>;
  appSettings: AppSettingsDTO;
  permissions: Permissions | null;
  userRole: string | null;
};

const PRIMARY_SLOT_COUNT = 4;

function isItemVisible(item: EmployeeNavItem, ctx: EmployeeNavContext): boolean {
  const { appSettings, permissions, userRole } = ctx;

  switch (item.id) {
    case 'stock':
      return (
        appSettings.featureStockEnabled && (permissions?.stock.view ?? false)
      );
    case 'orders':
      return (
        appSettings.featureOrdersEnabled &&
        checkRolePermission(userRole, 'orders', 'view')
      );
    case 'bank':
      return (
        appSettings.featureBankEnabled &&
        checkRolePermission(userRole, 'bank', 'access')
      );
    case 'privatePractice':
      return (
        appSettings.featurePrivatePracticeEnabled &&
        checkRolePermission(userRole, 'private_practice', 'access')
      );
    case 'weeklyActivity':
      return (
        appSettings.featureWeeklyDispensaryActivityEnabled &&
        (permissions?.weeklyDispensaryActivity.view ?? false)
      );
    case 'payroll':
      return (
        appSettings.featurePayrollEnabled && (permissions?.payrollReports.view ?? false)
      );
    case 'stockStatistics':
      return (
        appSettings.featureStockEnabled && (permissions?.stockStatistics.view ?? false)
      );
    case 'mails':
      return (
        appSettings.featureMailsEnabled &&
        checkRolePermission(userRole, 'mails', 'access')
      );
    case 'search':
      return (
        appSettings.featureSearchEnabled &&
        checkRolePermission(userRole, 'search', 'access')
      );
    default:
      return false;
  }
}

function buildAllItems(ctx: EmployeeNavContext): EmployeeNavItem[] {
  const { t } = ctx;
  return [
    {
      id: 'stock',
      label: 'Stocks',
      shortLabel: 'Stock',
      href: t.stock.index,
      icon: IconArchive,
      navOrder: 1,
    },
    {
      id: 'orders',
      label: 'Commandes',
      shortLabel: 'Commandes',
      href: t.orders.index,
      icon: IconNotebook,
      navOrder: 2,
    },
    {
      id: 'bank',
      label: 'Banque',
      shortLabel: 'Banque',
      href: t.bank.index,
      icon: IconCashRegister,
      navOrder: 3,
    },
    {
      id: 'privatePractice',
      label: 'Cabinet privé',
      shortLabel: 'Cabinet',
      href: t.privatePractice.index,
      icon: IconStethoscope,
      navOrder: 4,
    },
    {
      id: 'weeklyActivity',
      label: 'Activité hebdo',
      shortLabel: 'Activité',
      href: t.weeklyActivity.index,
      icon: IconCalendarWeek,
      navOrder: 10,
    },
    {
      id: 'payroll',
      label: 'Salaires',
      shortLabel: 'Salaires',
      href: t.employee.payroll,
      icon: IconReportMoney,
      navOrder: 11,
    },
    {
      id: 'stockStatistics',
      label: 'Stats stock',
      shortLabel: 'Stats',
      href: t.employee.stockStatistics,
      icon: IconAbacus,
      navOrder: 12,
    },
    {
      id: 'mails',
      label: 'Courriers',
      shortLabel: 'Courriers',
      href: t.employee.mails,
      icon: IconMail,
      navOrder: 13,
    },
    {
      id: 'search',
      label: 'Recherche',
      shortLabel: 'Recherche',
      href: t.searchItems.index,
      icon: IconSearch,
      navOrder: 14,
      iconOnly: true,
    },
  ];
}

export function getEmployeeNavItems(ctx: EmployeeNavContext): {
  primary: EmployeeNavItem[];
  more: EmployeeNavItem[];
} {
  const visible = buildAllItems(ctx)
    .filter((item) => isItemVisible(item, ctx))
    .sort((a, b) => a.navOrder - b.navOrder);

  const primary = visible.slice(0, PRIMARY_SLOT_COUNT);
  const primaryIds = new Set(primary.map((i) => i.id));
  const more = visible.filter((i) => !primaryIds.has(i.id));

  return { primary, more };
}
