import { NextRequest } from 'next/server';
import { routes } from './types/routes';
import { getAuthSession } from './lib/auth';
import { hasToBeLoggedOutMiddleware } from './middlewares/hasToBeLoggedOutMiddleware';
import { hasToBeLoggedInMiddleware } from './middlewares/hasToBeLoggedInMiddleware';
import { hasApplicationAccessMiddleware } from './middlewares/hasApplicationAccessMiddleware';
import { hasManagementAccessMiddleware } from './middlewares/hasManagementAccessMiddleware';
import { hasAdminRoleMiddleware } from './middlewares/hasAdminRoleMiddleware';
import { hasStockViewAccessMiddleware } from './middlewares/hasStockViewAccessMiddleware';
import { hasOrdersViewAccessMiddleware } from './middlewares/hasOrdersViewAccessMiddleware';
import { hasSearchAccessMiddleware } from './middlewares/hasSearchAccessMiddleware';
import { hasBankAccessMiddleware } from './middlewares/hasBankAccessMiddleware';
import { chain } from './middlewares/chain';

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
    // For admin routes, check login, application access, then management access
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasManagementAccessMiddleware);
    
    // For users page, also check that user has admin role
    if (pathname === routes.admin.users || pathname === routes.admin.overwriteStock) {
      middlewares.push(hasAdminRoleMiddleware);
    }
  } else if (pathname.startsWith(routes.stock.index)) {
    // For stock routes, check login, application access, then stock view access
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasStockViewAccessMiddleware);
  } else if (pathname.startsWith(routes.orders.index)) {
    // For orders routes, check login, application access, then orders view access
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasOrdersViewAccessMiddleware);
  } else if (pathname.startsWith(routes.searchItems.index)) {
    // For search-items routes, check login, application access, then search access
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasSearchAccessMiddleware);
  } else if (pathname.startsWith(routes.bank.index)) {
    // For bank routes, check login, application access, then bank access
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasBankAccessMiddleware);
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
    '/employee/:path*',
    '/management/:path*',
  ],
};
