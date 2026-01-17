import { NextRequest, NextResponse } from "next/server";

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
    // Retourner 404 Not Found sans contenu (pour masquer l'existence de la page)
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

