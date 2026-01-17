import { NextRequest } from 'next/server';
import { routes } from './types/routes';
import { getAuthSession } from './lib/auth';
import { hasToBeLoggedOutMiddleware } from './middlewares/hasToBeLoggedOutMiddleware';
import { hasToBeLoggedInMiddleware } from './middlewares/hasToBeLoggedInMiddleware';
import { hasApplicationAccessMiddleware } from './middlewares/hasApplicationAccessMiddleware';
import { chain } from './middlewares/chain';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const session = await getAuthSession();

  const middlewares = [];

  if (pathname.startsWith(routes.auth.index)) {
    // Pour les routes d'authentification, on vérifie seulement si l'utilisateur doit être déconnecté
    // Sauf pour la page no-access qui doit être accessible même si connecté
    if (pathname !== routes.auth.noAccess) {
      middlewares.push(hasToBeLoggedOutMiddleware);
    }
    // La page no-access est accessible sans vérification
  } else {
    // Pour les autres routes, on vérifie d'abord la connexion, puis l'accès à l'application
    middlewares.push(hasToBeLoggedInMiddleware);
    middlewares.push(hasApplicationAccessMiddleware);
  }

  return chain(...middlewares)(req, session);
}

export const config = {
  runtime: 'nodejs',
  matcher: ['/auth/:path*', '/settings/:path*', '/admin/:path*', '/test/:path*', '/inventory/:path*', '/orders/:path*', '/management/:path*'],
};
