import { NextRequest, NextResponse } from "next/server";
import { routes } from "@/types/routes";
import { forbiddenResponse } from "@/lib/response";
import { checkRolePermission } from "@/lib/auth/permissions";

export async function hasApplicationAccessMiddleware(
  request: NextRequest,
  session: any,
) {
  if (!session) {
    // Si pas de session, on laisse le middleware de connexion gérer
    return NextResponse.next();
  }

  // Utiliser directement les rôles pour vérifier les permissions (plus performant)
  const userRole = session.user?.role;
  const hasAccess = checkRolePermission(userRole, "application", "access");

  if (!hasAccess) {
    if (request.headers.get("content-type") === "application/json") {
      return forbiddenResponse({ error: "Vous n'avez pas accès à cette application" });
    }
    // Rediriger vers la page d'accès refusé
    return routes.redirect(request, routes.auth.noAccess);
  }

  return NextResponse.next();
}

