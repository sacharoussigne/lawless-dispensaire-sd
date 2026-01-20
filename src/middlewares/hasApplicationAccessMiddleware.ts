import { NextRequest, NextResponse } from "next/server";
import { checkRolePermission } from "@/lib/auth/permissions";
import { routes } from "@/types/routes";
import { forbiddenResponse } from "@/lib/response";

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
    // Pour les requêtes JSON, retourner une erreur JSON
    if (request.headers.get("content-type") === "application/json") {
      return forbiddenResponse({ error: "Access denied" });
    }
    // Sinon, rediriger vers la page no-access
    return routes.redirect(request, routes.auth.noAccess);
  }

  return NextResponse.next();
}

