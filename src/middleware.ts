import { NextRequest, NextResponse } from 'next/server';
import { routes, legacyPathToTenant, tenantRoutes } from './types/routes';
import { getAuthSession } from './lib/auth';
import { hasToBeLoggedOutMiddleware } from './middlewares/hasToBeLoggedOutMiddleware';
import { hasToBeLoggedInMiddleware } from './middlewares/hasToBeLoggedInMiddleware';
import { hasApplicationAccessMiddleware } from './middlewares/hasApplicationAccessMiddleware';
import { hasManagementAccessMiddleware } from './middlewares/hasManagementAccessMiddleware';
import { hasPlatformAdminMiddleware } from './middlewares/hasPlatformAdminMiddleware';
import { hasAdminRoleMiddleware } from './middlewares/hasAdminRoleMiddleware';
import { hasPayrollReportsAccessMiddleware } from './middlewares/hasPayrollReportsAccessMiddleware';
import { hasStockStatisticsAccessMiddleware } from './middlewares/hasStockStatisticsAccessMiddleware';
import { hasStockViewAccessMiddleware } from './middlewares/hasStockViewAccessMiddleware';
import { hasOrdersViewAccessMiddleware } from './middlewares/hasOrdersViewAccessMiddleware';
import { hasSearchAccessMiddleware } from './middlewares/hasSearchAccessMiddleware';
import { hasBankAccessMiddleware } from './middlewares/hasBankAccessMiddleware';
import { hasPrivatePracticeAccessMiddleware } from './middlewares/hasPrivatePracticeAccessMiddleware';
import { hasWeeklyDispensaryActivityMiddleware } from './middlewares/hasWeeklyDispensaryActivityMiddleware';
import { hasMailsAccessMiddleware } from './middlewares/hasMailsAccessMiddleware';
import { assertAppFeatureEnabledMiddleware } from './middlewares/assertAppFeatureEnabledMiddleware';
import { hasTenantAccessMiddleware } from './middlewares/hasTenantAccessMiddleware';
import { chain } from './middlewares/chain';
import type { AppMiddlewareSession } from '@/types/middlewareSession';
import { enrichSessionWithTenant } from './lib/dispensary/middlewareSession';
import { parseDispensarySlugFromPathname } from './lib/dispensary/slug';
import { DEFAULT_DISPENSARY_SLUG } from './lib/dispensary/constants';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const legacyTarget = legacyPathToTenant(pathname, DEFAULT_DISPENSARY_SLUG);
  if (legacyTarget) {
    return NextResponse.redirect(new URL(legacyTarget, req.url));
  }

  const session = await getAuthSession();
  const enrichedSession: AppMiddlewareSession = session
    ? await enrichSessionWithTenant(
        {
          user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: session.user.role ?? null,
          },
        },
        pathname,
      )
    : null;

  const slug = parseDispensarySlugFromPathname(pathname);
  const t = slug ? tenantRoutes(slug) : null;

  const middlewares = [];

  if (pathname.startsWith(routes.auth.index)) {
    if (
      pathname !== routes.auth.noAccess &&
      pathname !== routes.auth.noManagementAccess &&
      pathname !== routes.auth.noDispensaryAccess
    ) {
      middlewares.push(hasToBeLoggedOutMiddleware);
    }
  } else if (pathname.startsWith('/platform')) {
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasPlatformAdminMiddleware);
  } else if (pathname === '/admin/users' || pathname.startsWith('/admin/users/')) {
    const suffix = pathname.slice('/admin/users'.length);
    return NextResponse.redirect(new URL(`/platform/users${suffix}`, req.url));
  } else if (slug && t) {
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasTenantAccessMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);

    if (pathname.startsWith(`${t.management.index}`)) {
      middlewares.push(hasManagementAccessMiddleware);
    } else if (
      pathname === t.admin.settings ||
      pathname.startsWith(`${t.admin.settings}/`) ||
      pathname === t.admin.overwriteStock ||
      pathname.startsWith(`${t.admin.overwriteStock}/`) ||
      pathname === t.admin.members ||
      pathname.startsWith(`${t.admin.members}/`) ||
      pathname === t.admin.agendas ||
      pathname.startsWith(`${t.admin.agendas}/`)
    ) {
      middlewares.push(hasAdminRoleMiddleware);
      if (pathname === t.admin.settings || pathname.startsWith(`${t.admin.settings}/`)) {
        // settings page only
      }
      if (pathname === t.admin.overwriteStock || pathname.startsWith(`${t.admin.overwriteStock}/`)) {
        middlewares.push((request: NextRequest, s: AppMiddlewareSession) =>
          assertAppFeatureEnabledMiddleware(request, s, 'stock'),
        );
      }
    } else if (pathname.startsWith(t.admin.payroll)) {
      middlewares.push(hasPayrollReportsAccessMiddleware);
      middlewares.push((request: NextRequest, s: AppMiddlewareSession) =>
        assertAppFeatureEnabledMiddleware(request, s, 'payroll'),
      );
    } else if (pathname.startsWith(t.stock.index)) {
      middlewares.push(hasStockViewAccessMiddleware);
      middlewares.push((request: NextRequest, s: AppMiddlewareSession) =>
        assertAppFeatureEnabledMiddleware(request, s, 'stock'),
      );
    } else if (pathname.startsWith(t.orders.index)) {
      middlewares.push(hasOrdersViewAccessMiddleware);
      middlewares.push((request: NextRequest, s: AppMiddlewareSession) =>
        assertAppFeatureEnabledMiddleware(request, s, 'orders'),
      );
    } else if (pathname.startsWith(t.searchItems.index)) {
      middlewares.push(hasSearchAccessMiddleware);
      middlewares.push((request: NextRequest, s: AppMiddlewareSession) =>
        assertAppFeatureEnabledMiddleware(request, s, 'search'),
      );
    } else if (pathname.startsWith(t.bank.index)) {
      middlewares.push(hasBankAccessMiddleware);
      middlewares.push((request: NextRequest, s: AppMiddlewareSession) =>
        assertAppFeatureEnabledMiddleware(request, s, 'bank'),
      );
    } else if (pathname.startsWith(t.privatePractice.index)) {
      middlewares.push(hasPrivatePracticeAccessMiddleware);
      middlewares.push((request: NextRequest, s: AppMiddlewareSession) =>
        assertAppFeatureEnabledMiddleware(request, s, 'privatePractice'),
      );
    } else if (pathname.startsWith(t.weeklyActivity.index)) {
      middlewares.push(hasWeeklyDispensaryActivityMiddleware);
      middlewares.push((request: NextRequest, s: AppMiddlewareSession) =>
        assertAppFeatureEnabledMiddleware(request, s, 'weeklyDispensaryActivity'),
      );
    } else if (pathname.startsWith(t.agenda.index)) {
      middlewares.push((request: NextRequest, s: AppMiddlewareSession) =>
        assertAppFeatureEnabledMiddleware(request, s, 'agenda'),
      );
    } else if (
      pathname === t.employee.payroll ||
      pathname.startsWith(`${t.employee.payroll}/`)
    ) {
      middlewares.push(hasPayrollReportsAccessMiddleware);
      middlewares.push((request: NextRequest, s: AppMiddlewareSession) =>
        assertAppFeatureEnabledMiddleware(request, s, 'payroll'),
      );
    } else if (
      pathname === t.employee.stockStatistics ||
      pathname.startsWith(`${t.employee.stockStatistics}/`)
    ) {
      middlewares.push(hasStockStatisticsAccessMiddleware);
      middlewares.push((request: NextRequest, s: AppMiddlewareSession) =>
        assertAppFeatureEnabledMiddleware(request, s, 'stock'),
      );
    } else if (pathname.startsWith(t.employee.mails)) {
      middlewares.push(hasMailsAccessMiddleware);
      middlewares.push((request: NextRequest, s: AppMiddlewareSession) =>
        assertAppFeatureEnabledMiddleware(request, s, 'mails'),
      );
    }
  } else if (pathname.startsWith(routes.settings.index)) {
    middlewares.push(hasToBeLoggedInMiddleware);
  } else if (pathname === '/') {
    middlewares.push(hasToBeLoggedInMiddleware);
  } else if (!pathname.startsWith('/platform') && !pathname.startsWith('/admin/users')) {
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
  } else {
    middlewares.push(hasToBeLoggedInMiddleware);
  }

  return chain(...middlewares)(req, enrichedSession);
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    '/',
    '/auth/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/platform/:path*',
    '/d/:dispensarySlug/:path*',
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
