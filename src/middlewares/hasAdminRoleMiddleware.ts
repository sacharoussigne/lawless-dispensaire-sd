import { NextRequest, NextResponse } from "next/server";
import { routes } from "@/types/routes";
import { hasRole } from "@/lib/auth/permissions";
import { Role } from "@/types/enum/roles";
import type { AppMiddlewareSession } from '@/types/middlewareSession';
import { getMiddlewareRole } from '@/types/middlewareSession';

export async function hasAdminRoleMiddleware(
  request: NextRequest,
  session: AppMiddlewareSession,
) {
  if (!session) {
    return NextResponse.next();
  }

  // Check that user has admin role
  const userRole = getMiddlewareRole(session);
  
  if (!hasRole(userRole, Role.ADMIN)) {
    return routes.redirect(request, routes.auth.noManagementAccess);
  }

  return NextResponse.next();
}

