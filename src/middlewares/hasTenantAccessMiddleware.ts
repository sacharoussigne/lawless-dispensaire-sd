import { NextRequest, NextResponse } from 'next/server';
import { routes } from '@/types/routes';
import type { AppMiddlewareSession } from '@/types/middlewareSession';
import { parseDispensarySlugFromPathname } from '@/lib/dispensary/slug';
import { assertTenantAccessInMiddleware } from '@/lib/dispensary/middlewareSession';
import { resolveDispensaryAccessDeniedRedirect } from '@/lib/dispensary/context';

export async function hasTenantAccessMiddleware(
  request: NextRequest,
  session: AppMiddlewareSession,
) {
  const pathname = request.nextUrl.pathname;
  const slug = parseDispensarySlugFromPathname(pathname);
  if (!slug) {
    return NextResponse.next();
  }
  if (!session) {
    return NextResponse.next();
  }
  if (!session.tenant) {
    return NextResponse.next();
  }
  const allowed = await assertTenantAccessInMiddleware(session);
  if (!allowed) {
    const target = await resolveDispensaryAccessDeniedRedirect(
      { user: session.user },
      pathname,
    );
    return routes.redirect(request, target);
  }
  return NextResponse.next();
}
