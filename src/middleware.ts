import { NextRequest } from 'next/server';
import { routes } from './types/routes';
import { getAuthSession } from './lib/auth';
import { hasToBeLoggedOutMiddleware } from './middlewares/hasToBeLoggedOutMiddleware';
import { hasToBeLoggedInMiddleware } from './middlewares/hasToBeLoggedInMiddleware';
import { hasApplicationAccessMiddleware } from './middlewares/hasApplicationAccessMiddleware';
import { hasManagementAccessMiddleware } from './middlewares/hasManagementAccessMiddleware';
import { hasAdminRoleMiddleware } from './middlewares/hasAdminRoleMiddleware';
import { hasPayrollReportsAccessMiddleware } from './middlewares/hasPayrollReportsAccessMiddleware';
import { hasStockViewAccessMiddleware } from './middlewares/hasStockViewAccessMiddleware';
import { hasOrdersViewAccessMiddleware } from './middlewares/hasOrdersViewAccessMiddleware';
import { hasSearchAccessMiddleware } from './middlewares/hasSearchAccessMiddleware';
import { hasBankAccessMiddleware } from './middlewares/hasBankAccessMiddleware';
import { hasPrivatePracticeAccessMiddleware } from './middlewares/hasPrivatePracticeAccessMiddleware';
import { hasWeeklyDispensaryActivityMiddleware } from './middlewares/hasWeeklyDispensaryActivityMiddleware';
import { hasMailsAccessMiddleware } from './middlewares/hasMailsAccessMiddleware';
import { assertAppFeatureEnabledMiddleware } from './middlewares/assertAppFeatureEnabledMiddleware';
import { chain } from './middlewares/chain';
import type { AppMiddlewareSession } from '@/types/middlewareSession';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const session = await getAuthSession();

  const middlewares = [];

  if (pathname.startsWith(routes.auth.index)) {
    // For auth routes, only check if user should be logged out
    // Except for no-access pages which should be accessible even if logged in
    if (pathname !== routes.auth.noAccess && pathname !== routes.auth.noManagementAccess) {
      middlewares.push(hasToBeLoggedOutMiddleware);
    }
  } else if (pathname.startsWith(routes.management.index)) {
    // For management routes, check login, application access, then management access
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasManagementAccessMiddleware);
  } else if (pathname.startsWith(routes.admin.index)) {
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    const isPayrollRoute =
      pathname === routes.admin.payroll || pathname.startsWith(`${routes.admin.payroll}/`);
    if (isPayrollRoute) {
      middlewares.push(hasPayrollReportsAccessMiddleware);
      middlewares.push((request: NextRequest, session: AppMiddlewareSession) =>
        assertAppFeatureEnabledMiddleware(request, session, 'payroll'),
      );
    } else {
      middlewares.push(hasManagementAccessMiddleware);
      if (
        pathname === routes.admin.users ||
        pathname === routes.admin.overwriteStock ||
        pathname === routes.admin.settings
      ) {
        middlewares.push(hasAdminRoleMiddleware);
      }
    }
  } else if (pathname.startsWith(routes.stock.index)) {
    // For stock routes, check login, application access, then stock view access
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasStockViewAccessMiddleware);
    middlewares.push((request: NextRequest, session: AppMiddlewareSession) =>
      assertAppFeatureEnabledMiddleware(request, session, 'stock'),
    );
  } else if (pathname.startsWith(routes.orders.index)) {
    // For orders routes, check login, application access, then orders view access
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasOrdersViewAccessMiddleware);
    middlewares.push((request: NextRequest, session: AppMiddlewareSession) =>
      assertAppFeatureEnabledMiddleware(request, session, 'orders'),
    );
  } else if (pathname.startsWith(routes.searchItems.index)) {
    // For search-items routes, check login, application access, then search access
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasSearchAccessMiddleware);
    middlewares.push((request: NextRequest, session: AppMiddlewareSession) =>
      assertAppFeatureEnabledMiddleware(request, session, 'search'),
    );
  } else if (pathname.startsWith(routes.bank.index)) {
    // For bank routes, check login, application access, then bank access
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasBankAccessMiddleware);
    middlewares.push((request: NextRequest, session: AppMiddlewareSession) =>
      assertAppFeatureEnabledMiddleware(request, session, 'bank'),
    );
  } else if (pathname.startsWith(routes.privatePractice.index)) {
    // For private practice routes, check login, application access, then private practice access
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasPrivatePracticeAccessMiddleware);
    middlewares.push((request: NextRequest, session: AppMiddlewareSession) =>
      assertAppFeatureEnabledMiddleware(request, session, 'privatePractice'),
    );
  } else if (pathname.startsWith(routes.weeklyActivity.index)) {
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasWeeklyDispensaryActivityMiddleware);
    middlewares.push((request: NextRequest, session: AppMiddlewareSession) =>
      assertAppFeatureEnabledMiddleware(request, session, 'weeklyDispensaryActivity'),
    );
  } else if (
    pathname === routes.employee.payroll ||
    pathname.startsWith(`${routes.employee.payroll}/`)
  ) {
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasPayrollReportsAccessMiddleware);
    middlewares.push((request: NextRequest, session: AppMiddlewareSession) =>
      assertAppFeatureEnabledMiddleware(request, session, 'payroll'),
    );
  } else if (pathname.startsWith(routes.employee.mails)) {
    // For employee mails routes, check login, application access, then mails access
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasMailsAccessMiddleware);
    middlewares.push((request: NextRequest, session: AppMiddlewareSession) =>
      assertAppFeatureEnabledMiddleware(request, session, 'mails'),
    );
  } else {
    // For other routes, first check login, then application access
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
  }

  return chain(...middlewares)(req, session);
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    '/',
    '/auth/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/test/:path*',
    '/inventory/:path*',
    '/orders/:path*',
    '/stock/:path*',
    '/search-items/:path*',
    '/bank/:path*',
    '/private-practice/:path*',
    '/weekly-activity/:path*',
    '/employee/:path*',
    '/management/:path*',
  ],
};
