import { NextRequest } from 'next/server';
import { routes } from './types/routes';
import { getAuthSession } from './lib/auth';
import { hasToBeLoggedOutMiddleware } from './middlewares/hasToBeLoggedOutMiddleware';
import { hasToBeLoggedInMiddleware } from './middlewares/hasToBeLoggedInMiddleware';
import { chain } from './middlewares/chain';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const session = await getAuthSession();

  const middlewares = [];

  if (pathname.startsWith(routes.auth.index)) {
    middlewares.push(hasToBeLoggedOutMiddleware);
  } else {
    middlewares.push(hasToBeLoggedInMiddleware);
  }

  return chain(...middlewares)(req, session);
}

export const config = {
  runtime: 'nodejs',
  matcher: ['/auth/:path*', '/settings/:path*', '/admin/:path*', '/test/:path*', '/inventory/:path*', '/orders/:path*', '/management/:path*'],
};
