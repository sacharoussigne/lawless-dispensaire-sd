import { NextRequest, NextResponse } from "next/server";
import { checkRolePermission } from "@/lib/auth/permissions";
import { routes } from "@/types/routes";
import { forbiddenResponse } from "@/lib/response";

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
    if (request.headers.get("content-type") === "application/json") {
      return forbiddenResponse({ error: "Accès au stock refusé" });
    }
    return routes.redirect(request, routes.auth.noAccess);
  }

  return NextResponse.next();
}
