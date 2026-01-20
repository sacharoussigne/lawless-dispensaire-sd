import { NextRequest, NextResponse } from "next/server";
import { routes } from "@/types/routes";
import { forbiddenResponse } from "@/lib/response";

export async function hasAdminRoleMiddleware(
  request: NextRequest,
  session: any,
) {
  if (!session) {
    // Si pas de session, on laisse le middleware de connexion gérer
    return NextResponse.next();
  }

  // Vérifier que l'utilisateur a le rôle admin
  const userRole = session.user?.role;
  
  if (userRole !== 'admin') {
    // Pour les requêtes JSON, retourner une erreur JSON
    if (request.headers.get("content-type") === "application/json") {
      return forbiddenResponse({ error: "Accès administrateur requis" });
    }
    // Sinon, rediriger vers la page no-management-access (car c'est généralement pour les pages admin)
    return routes.redirect(request, routes.auth.noManagementAccess);
  }

  return NextResponse.next();
}

