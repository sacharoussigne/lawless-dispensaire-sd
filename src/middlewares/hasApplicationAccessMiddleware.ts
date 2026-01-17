import { NextRequest, NextResponse } from "next/server";
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
    // Retourner 403 Forbidden sans contenu
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}

