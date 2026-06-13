import { type NextRequest, NextResponse } from "next/server";
import { checkRolePermission } from "@/lib/auth/permissions";
import { routes } from "@/types/routes";
import type { AppMiddlewareSession } from '@/types/middlewareSession';
import { getMiddlewareRole } from '@/types/middlewareSession';

export async function hasSearchAccessMiddleware(
  request: NextRequest,
  session: AppMiddlewareSession,
) {
  if (!session) {
    return NextResponse.next();
  }

  const userRole = getMiddlewareRole(session);
  const hasAccess = checkRolePermission(userRole, "search", "access");

  if (!hasAccess) {
    return routes.redirect(request, routes.auth.noAccess);
  }

  return NextResponse.next();
}
