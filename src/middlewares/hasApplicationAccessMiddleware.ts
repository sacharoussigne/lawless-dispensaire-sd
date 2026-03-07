import { NextRequest, NextResponse } from "next/server";
import { checkRolePermission } from "@/lib/auth/permissions";
import { routes } from "@/types/routes";

export async function hasApplicationAccessMiddleware(
  request: NextRequest,
  session: any,
) {
  if (!session) {
    // If no session, let login middleware handle it
    return NextResponse.next();
  }

  // Use roles directly to check permissions (more performant)
  const userRole = session.user?.role;
  const hasAccess = checkRolePermission(userRole, "application", "access");

  if (!hasAccess) {
    return routes.redirect(request, routes.auth.noAccess);
  }

  return NextResponse.next();
}

