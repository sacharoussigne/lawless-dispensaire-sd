import { NextRequest, NextResponse } from "next/server";
import { checkRolePermission } from "@/lib/auth/permissions";
import { routes } from "@/types/routes";
import { forbiddenResponse } from "@/lib/response";

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
    if (request.headers.get("content-type") === "application/json") {
      return forbiddenResponse({ error: "Accès à la recherche refusé" });
    }
    return routes.redirect(request, routes.auth.noAccess);
  }

  return NextResponse.next();
}
