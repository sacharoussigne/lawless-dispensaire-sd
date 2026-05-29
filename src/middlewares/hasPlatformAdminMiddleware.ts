import { NextRequest, NextResponse } from 'next/server';
import { routes } from '@/types/routes';
import { isPlatformAdmin } from '@/lib/dispensary/platformAdmin';
import type { AppMiddlewareSession } from '@/types/middlewareSession';

export async function hasPlatformAdminMiddleware(
  request: NextRequest,
  session: AppMiddlewareSession,
) {
  if (!session) {
    return routes.redirect(request, routes.auth.login);
  }
  if (!isPlatformAdmin(session.user?.role)) {
    return routes.redirect(request, routes.auth.noManagementAccess);
  }
  return NextResponse.next();
}
