import { NextRequest, NextResponse } from "next/server";
import { checkRolePermission } from "@/lib/auth/permissions";
import { routes } from "@/types/routes";

export async function hasSearchAccessMiddleware(
  request: NextRequest,
  session: any,
) {
  if (!session) {
    return NextResponse.next();
  }

  const userRole = session.user?.role;
  const hasAccess = checkRolePermission(userRole, "search", "access");

  if (!hasAccess) {
    return routes.redirect(request, routes.auth.noAccess);
  }

  return NextResponse.next();
}
