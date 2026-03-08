import { NextRequest, NextResponse } from 'next/server';

export const routes = {
  test: {
    index: '/test',
  },
  admin: {
    index: '/admin',
    users: '/admin/users',
    overwriteStock: '/admin/overwrite-stock',
  },
  management: {
    index: '/management',
    companies: '/management/companies',
    companyGroups: '/management/companygroups',
    categoryItems: '/management/categoryitems',
    items: '/management/items',
    mails: '/management/mails',
    chests: '/management/chests',
  },
  api: {},
  settings: {
    index: '/settings',
  },
  stock: {
    index: '/stock',
  },
  orders: {
    index: '/orders',
  },
  searchItems: {
    index: '/search-items',
  },
  bank: {
    index: '/bank',
  },
  privatePractice: {
    index: '/private-practice',
  },
  employee: {
    index: '/employee',
    mails: '/employee/mails',
    newMail: '/employee/mails/new',
    editMail: (id: string) => `/employee/mails/${id}/edit`,
    testTemplate: (id: string) => `/employee/mails/templates/${id}/test`,
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
  },
  redirect: (request: NextRequest, route: string) => {
    return NextResponse.redirect(new URL(route, request.url));
  },
};
