import { NextRequest, NextResponse } from "next/server";
import { checkRolePermission } from "@/lib/auth/permissions";
import { routes } from "@/types/routes";
import { forbiddenResponse } from "@/lib/response";

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
    // Pour les requêtes JSON, retourner une erreur JSON
    if (request.headers.get("content-type") === "application/json") {
      return forbiddenResponse({ error: "Accès à la gestion refusé" });
    }
    // Sinon, rediriger vers la page no-management-access
    return routes.redirect(request, routes.auth.noManagementAccess);
  }

  return NextResponse.next();
}

