import { NextRequest, NextResponse } from "next/server";
import { routes } from "@/types/routes";
import { forbiddenResponse } from "@/lib/response";
import { checkRolePermission } from "@/lib/auth/permissions";

export async function hasManagementAccessMiddleware(
  request: NextRequest,
  session: any,
) {
  if (!session) {
    // Si pas de session, on laisse le middleware de connexion gérer
    return NextResponse.next();
  }

  // Utiliser directement les rôles pour vérifier les permissions (plus performant)
  const userRole = session.user?.role;
  const hasManagementAccess = checkRolePermission(userRole, "application", "management");

  if (!hasManagementAccess) {
    if (request.headers.get("content-type") === "application/json") {
      return forbiddenResponse({ error: "Vous n'avez pas accès à la gestion de l'application" });
    }
    // Rediriger vers la page d'accès refusé au management
    return routes.redirect(request, routes.auth.noManagementAccess);
  }

  return NextResponse.next();
}

