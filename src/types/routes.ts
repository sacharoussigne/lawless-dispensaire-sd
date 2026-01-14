import { NextRequest, NextResponse } from 'next/server';

export const routes = {
  test: {
    index: '/test',
  },
  admin: {},
  api: {},
  settings: {
    index: '/settings',
  },
  auth: {
    index: '/auth',
    login: '/auth/login',
    logout: '/auth/logout',
    register: '/auth/register',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
  },
  redirect: (request: NextRequest, route: string) => {
    return NextResponse.redirect(new URL(route, request.url));
  },
};
