import { NextRequest, NextResponse } from "next/server";
import { checkRolePermission } from "@/lib/auth/permissions";
import { routes } from "@/types/routes";
import type { AppMiddlewareSession } from '@/types/middlewareSession';
import { getMiddlewareRole } from '@/types/middlewareSession';

export async function hasManagementAccessMiddleware(
  request: NextRequest,
  session: AppMiddlewareSession,
) {
  if (!session) {
    return NextResponse.next();
  }

  // Use roles directly to check permissions (more performant)
  const userRole = getMiddlewareRole(session);
  const hasManagementAccess = checkRolePermission(userRole, "application", "management");

  if (!hasManagementAccess) {
    return routes.redirect(request, routes.auth.noManagementAccess);
  }

  return NextResponse.next();
}

