import { type NextRequest, NextResponse } from 'next/server';
import { checkRolePermission } from '@/lib/auth/permissions';
import { routes } from '@/types/routes';
import type { AppMiddlewareSession } from '@/types/middlewareSession';
import { getMiddlewareRole } from '@/types/middlewareSession';

export async function hasStockStatisticsAccessMiddleware(
  request: NextRequest,
  session: AppMiddlewareSession,
) {
  if (!session) {
    return NextResponse.next();
  }

  const userRole = getMiddlewareRole(session);
  const allowed = checkRolePermission(userRole, 'stock_statistics', 'view');

  if (!allowed) {
    return routes.redirect(request, routes.auth.noManagementAccess);
  }

  return NextResponse.next();
}
