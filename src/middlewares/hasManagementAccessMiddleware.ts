import { NextRequest, NextResponse } from "next/server";
import { checkRolePermission } from "@/lib/auth/permissions";
import { routes } from "@/types/routes";

export async function hasManagementAccessMiddleware(
  request: NextRequest,
  session: any,
) {
  if (!session) {
    return NextResponse.next();
  }

  // Use roles directly to check permissions (more performant)
  const userRole = session.user?.role;
  const hasManagementAccess = checkRolePermission(userRole, "application", "management");

  if (!hasManagementAccess) {
    return routes.redirect(request, routes.auth.noManagementAccess);
  }

  return NextResponse.next();
}

