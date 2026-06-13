import { type NextRequest, NextResponse } from 'next/server';
import { DEFAULT_DISPENSARY_SLUG } from '@/lib/dispensary/constants';

export function dispensaryBase(slug: string): string {
  return `/d/${encodeURIComponent(slug)}`;
}

export function tenantRoutes(slug: string) {
  const base = dispensaryBase(slug);
  return {
    employee: {
      index: `${base}/employee`,
      payroll: `${base}/employee/payroll`,
      payrollNew: `${base}/employee/payroll/new`,
      payrollDetail: (id: string) => `${base}/employee/payroll/${id}`,
      stockStatistics: `${base}/employee/stock-statistics`,
      mails: `${base}/employee/mails`,
      newMail: `${base}/employee/mails/new`,
      editMail: (id: string) => `${base}/employee/mails/${id}/edit`,
      newTemplate: `${base}/employee/mails/templates/new`,
      editTemplate: (id: string) => `${base}/employee/mails/templates/${id}/edit`,
      testTemplate: (id: string) => `${base}/employee/mails/templates/${id}/test`,
    },
    stock: { index: `${base}/stock` },
    orders: { index: `${base}/orders` },
    searchItems: { index: `${base}/search-items` },
    bank: { index: `${base}/bank` },
    privatePractice: { index: `${base}/private-practice` },
    weeklyActivity: { index: `${base}/weekly-activity` },
    agenda: { index: `${base}/agenda` },
    management: {
      index: `${base}/management`,
      companies: `${base}/management/companies`,
      companyGroups: `${base}/management/companygroups`,
      categoryItems: `${base}/management/categoryitems`,
      items: `${base}/management/items`,
      mails: `${base}/management/mails`,
      chests: `${base}/management/chests`,
    },
    admin: {
      index: `${base}/admin`,
      settings: `${base}/admin/settings`,
      members: `${base}/admin/members`,
      overwriteStock: `${base}/admin/overwrite-stock`,
      payroll: `${base}/admin/payroll`,
      payrollNew: `${base}/admin/payroll/new`,
      payrollDetail: (id: string) => `${base}/admin/payroll/${id}`,
      agendas: `${base}/admin/agendas`,
    },
  };
}

/** @deprecated Use tenantRoutes(slug) for tenant-scoped navigation */
export const routes = {
  test: {
    index: '/test',
  },
  platform: {
    dispensaries: '/platform/dispensaries',
    users: '/platform/users',
  },
  admin: {
    index: '/admin',
    /** @deprecated Use routes.platform.users */
    users: '/platform/users',
  },
  /** Legacy paths — redirect to default dispensary */
  management: {
    index: `/d/${DEFAULT_DISPENSARY_SLUG}/management`,
    companies: `/d/${DEFAULT_DISPENSARY_SLUG}/management/companies`,
    companyGroups: `/d/${DEFAULT_DISPENSARY_SLUG}/management/companygroups`,
    categoryItems: `/d/${DEFAULT_DISPENSARY_SLUG}/management/categoryitems`,
    items: `/d/${DEFAULT_DISPENSARY_SLUG}/management/items`,
    mails: `/d/${DEFAULT_DISPENSARY_SLUG}/management/mails`,
    chests: `/d/${DEFAULT_DISPENSARY_SLUG}/management/chests`,
  },
  api: {},
  settings: {
    index: '/settings',
  },
  stock: { index: `/d/${DEFAULT_DISPENSARY_SLUG}/stock` },
  orders: { index: `/d/${DEFAULT_DISPENSARY_SLUG}/orders` },
  searchItems: { index: `/d/${DEFAULT_DISPENSARY_SLUG}/search-items` },
  bank: { index: `/d/${DEFAULT_DISPENSARY_SLUG}/bank` },
  privatePractice: { index: `/d/${DEFAULT_DISPENSARY_SLUG}/private-practice` },
  weeklyActivity: { index: `/d/${DEFAULT_DISPENSARY_SLUG}/weekly-activity` },
  employee: {
    index: `/d/${DEFAULT_DISPENSARY_SLUG}/employee`,
    payroll: `/d/${DEFAULT_DISPENSARY_SLUG}/employee/payroll`,
    payrollNew: `/d/${DEFAULT_DISPENSARY_SLUG}/employee/payroll/new`,
    payrollDetail: (id: string) => `/d/${DEFAULT_DISPENSARY_SLUG}/employee/payroll/${id}`,
    stockStatistics: `/d/${DEFAULT_DISPENSARY_SLUG}/employee/stock-statistics`,
    mails: `/d/${DEFAULT_DISPENSARY_SLUG}/employee/mails`,
    newMail: `/d/${DEFAULT_DISPENSARY_SLUG}/employee/mails/new`,
    editMail: (id: string) => `/d/${DEFAULT_DISPENSARY_SLUG}/employee/mails/${id}/edit`,
    newTemplate: `/d/${DEFAULT_DISPENSARY_SLUG}/employee/mails/templates/new`,
    editTemplate: (id: string) => `/d/${DEFAULT_DISPENSARY_SLUG}/employee/mails/templates/${id}/edit`,
    testTemplate: (id: string) => `/d/${DEFAULT_DISPENSARY_SLUG}/employee/mails/templates/${id}/test`,
  },
  auth: {
    index: '/auth',
    login: '/auth/login',
    logout: '/auth/logout',
    register: '/auth/register',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
    noAccess: '/auth/no-access',
    noManagementAccess: '/auth/no-management-access',
    noDispensaryAccess: '/auth/no-dispensary-access',
  },
  redirect: (request: NextRequest, route: string) => {
    return NextResponse.redirect(new URL(route, request.url));
  },
};

export const LEGACY_TENANT_PATHS = [
  '/stock',
  '/orders',
  '/search-items',
  '/bank',
  '/private-practice',
  '/weekly-activity',
  '/employee',
  '/management',
  '/admin/settings',
  '/admin/overwrite-stock',
  '/admin/payroll',
] as const;

export function legacyPathToTenant(pathname: string, slug: string = DEFAULT_DISPENSARY_SLUG): string | null {
  for (const legacy of LEGACY_TENANT_PATHS) {
    if (pathname === legacy) {
      return `/d/${slug}${legacy === '/employee' ? '/employee' : legacy}`;
    }
    if (pathname.startsWith(`${legacy}/`)) {
      return `/d/${slug}${pathname}`;
    }
  }
  if (pathname.startsWith('/platform')) {
    return null;
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (pathname === '/admin/users' || pathname.startsWith('/admin/users/')) {
      return `/platform/users${pathname.slice('/admin/users'.length)}`;
    }
    return `/d/${slug}${pathname}`;
  }
  return null;
}
