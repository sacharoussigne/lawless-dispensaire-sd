import { NextRequest } from 'next/server';
import { routes } from './types/routes';
import { getAuthSession } from './lib/auth';
import { hasToBeLoggedOutMiddleware } from './middlewares/hasToBeLoggedOutMiddleware';
import { hasToBeLoggedInMiddleware } from './middlewares/hasToBeLoggedInMiddleware';
import { hasApplicationAccessMiddleware } from './middlewares/hasApplicationAccessMiddleware';
import { hasManagementAccessMiddleware } from './middlewares/hasManagementAccessMiddleware';
import { hasAdminRoleMiddleware } from './middlewares/hasAdminRoleMiddleware';
import { chain } from './middlewares/chain';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const session = await getAuthSession();

  const middlewares = [];

  if (pathname.startsWith(routes.auth.index)) {
    // Pour les routes d'authentification, on vérifie seulement si l'utilisateur doit être déconnecté
    // Sauf pour les pages no-access qui doivent être accessibles même si connecté
    if (pathname !== routes.auth.noAccess && pathname !== routes.auth.noManagementAccess) {
      middlewares.push(hasToBeLoggedOutMiddleware);
    }
    // Les pages no-access sont accessibles sans vérification
  } else if (pathname.startsWith(routes.admin.index)) {
    // Pour les routes admin, on vérifie la connexion, l'accès à l'application, puis l'accès au management
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
    middlewares.push(hasManagementAccessMiddleware);
    
    // Pour la page users, on vérifie aussi que l'utilisateur a le rôle admin
    if (pathname === routes.admin.users) {
      middlewares.push(hasAdminRoleMiddleware);
    }
  } else {
    // Pour les autres routes, on vérifie d'abord la connexion, puis l'accès à l'application
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
  }

  return chain(...middlewares)(req, session);
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    '/',
    '/auth/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/test/:path*',
    '/inventory/:path*',
    '/orders/:path*',
    '/stock/:path*',
    '/management/:path*',
  ],
};
