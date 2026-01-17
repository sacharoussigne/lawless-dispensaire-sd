import { NextRequest, NextResponse } from 'next/server';

export const routes = {
  test: {
    index: '/test',
  },
  admin: {
    index: '/admin',
    locations: '/admin/locations',
    companies: '/admin/companies',
    companyGroups: '/admin/companygroups',
    categoryItems: '/admin/categoryitems',
    items: '/admin/items',
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
