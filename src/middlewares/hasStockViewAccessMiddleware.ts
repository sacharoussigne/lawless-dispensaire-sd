import { NextRequest, NextResponse } from "next/server";
import { checkRolePermission } from "@/lib/auth/permissions";
import { routes } from "@/types/routes";

export async function hasStockViewAccessMiddleware(
  request: NextRequest,
  session: any,
) {
  if (!session) {
    return NextResponse.next();
  }

  const userRole = session.user?.role;
  const hasAccess = checkRolePermission(userRole, "stock", "view");

  if (!hasAccess) {
    return routes.redirect(request, routes.auth.noAccess);
  }

  return NextResponse.next();
}
