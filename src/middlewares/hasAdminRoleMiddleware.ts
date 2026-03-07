import { NextRequest, NextResponse } from "next/server";
import { routes } from "@/types/routes";
import { forbiddenResponse } from "@/lib/response";
import { hasRole } from "@/lib/auth/permissions";
import { Role } from "@/types/enum/roles";

export async function hasAdminRoleMiddleware(
  request: NextRequest,
  session: any,
) {
  if (!session) {
    // If no session, let login middleware handle it
    return NextResponse.next();
  }

  // Check that user has admin role
  const userRole = session.user?.role;
  
  if (!hasRole(userRole, Role.ADMIN)) {
    // For JSON requests, return JSON error
    if (request.headers.get("content-type") === "application/json") {
      return forbiddenResponse({ error: "Accès administrateur requis" });
    }
    // Otherwise, redirect to no-management-access page (as it's usually for admin pages)
    return routes.redirect(request, routes.auth.noManagementAccess);
  }

  return NextResponse.next();
}

