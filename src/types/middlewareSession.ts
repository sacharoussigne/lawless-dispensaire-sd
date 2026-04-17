import type { NextRequest, NextResponse } from 'next/server';

export type AppMiddlewareSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
} | null;

export type AppMiddleware = (
  request: NextRequest,
  session: AppMiddlewareSession,
) => Promise<NextResponse>;
