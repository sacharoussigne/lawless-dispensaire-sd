import { NextRequest, NextResponse } from "next/server";
import { checkRolePermission } from "@/lib/auth/permissions";
import { routes } from "@/types/routes";
import { forbiddenResponse } from "@/lib/response";

export async function hasManagementAccessMiddleware(
  request: NextRequest,
  session: any,
) {
  if (!session) {
    // If no session, let login middleware handle it
    return NextResponse.next();
  }

  // Use roles directly to check permissions (more performant)
  const userRole = session.user?.role;
  const hasManagementAccess = checkRolePermission(userRole, "application", "management");

  if (!hasManagementAccess) {
    // For JSON requests, return JSON error
    if (request.headers.get("content-type") === "application/json") {
      return forbiddenResponse({ error: "Accès à la gestion refusé" });
    }
    // Otherwise, redirect to no-management-access page
    return routes.redirect(request, routes.auth.noManagementAccess);
  }

  return NextResponse.next();
}

