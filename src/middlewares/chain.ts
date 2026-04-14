import { NextRequest, NextResponse } from 'next/server';
import type { AppMiddleware, AppMiddlewareSession } from '@/types/middlewareSession';

export const chain = (...middlewares: AppMiddleware[]) => {
  return async (req: NextRequest, session: AppMiddlewareSession) => {
    for (const middleware of middlewares) {
      const result = await middleware(req, session);
      if (
        result.headers.get('Location') ||
        result.status !== 200 ||
        result.headers.get('x-middleware-rewrite') ||
        result.headers.get('content-type') === 'application/json'
      ) {
        return result;
      }
    }
    return NextResponse.next();
  };
};
