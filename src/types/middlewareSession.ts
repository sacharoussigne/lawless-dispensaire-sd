import type { NextRequest, NextResponse } from 'next/server';

export type TenantMiddlewareContext = {
  dispensaryId: string;
  dispensarySlug: string;
  effectiveRole: string | null;
};

export type AppMiddlewareSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  tenant?: TenantMiddlewareContext;
} | null;

export type AppMiddleware = (
  request: NextRequest,
  session: AppMiddlewareSession,
) => Promise<NextResponse>;

export function getMiddlewareRole(session: AppMiddlewareSession): string | null | undefined {
  if (session?.tenant) {
    return session.tenant.effectiveRole;
  }
  return session?.user?.role;
}
