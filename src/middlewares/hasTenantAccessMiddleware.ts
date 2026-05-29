import { NextRequest, NextResponse } from 'next/server';
import { routes } from '@/types/routes';
import type { AppMiddlewareSession } from '@/types/middlewareSession';
import { parseDispensarySlugFromPathname } from '@/lib/dispensary/slug';
import { assertTenantAccessInMiddleware } from '@/lib/dispensary/middlewareSession';

export async function hasTenantAccessMiddleware(
  request: NextRequest,
  session: AppMiddlewareSession,
) {
  const slug = parseDispensarySlugFromPathname(request.nextUrl.pathname);
  if (!slug) {
    return NextResponse.next();
  }
  if (!session) {
    return NextResponse.next();
  }
  if (!session.tenant) {
    return routes.redirect(request, routes.auth.noAccess);
  }
  const allowed = await assertTenantAccessInMiddleware(session);
  if (!allowed) {
    return routes.redirect(request, routes.auth.noAccess);
  }
  return NextResponse.next();
}
