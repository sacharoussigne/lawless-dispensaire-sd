import { NextRequest, NextResponse } from 'next/server';
import { checkRolePermission } from '@/lib/auth/permissions';
import { routes } from '@/types/routes';
import type { AppMiddlewareSession } from '@/types/middlewareSession';

export async function hasWeeklyDispensaryActivityMiddleware(
  request: NextRequest,
  session: AppMiddlewareSession,
) {
  if (!session) {
    return NextResponse.next();
  }

  const userRole = session.user?.role;
  const allowed = checkRolePermission(userRole, 'weekly_dispensary_activity', 'view');

  if (!allowed) {
    return routes.redirect(request, routes.auth.noAccess);
  }

  return NextResponse.next();
}
