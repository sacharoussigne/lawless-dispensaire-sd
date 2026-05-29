import prisma from '@/lib/prisma';
import { parseDispensarySlugFromPathname } from '@/lib/dispensary/slug';
import {
  getEffectiveRoleForDispensary,
  userCanAccessDispensary,
} from '@/lib/dispensary/context';
import type { AppMiddlewareSession } from '@/types/middlewareSession';

export async function enrichSessionWithTenant(
  session: AppMiddlewareSession,
  pathname: string,
): Promise<AppMiddlewareSession> {
  if (!session?.user?.id) {
    return session;
  }
  const slug = parseDispensarySlugFromPathname(pathname);
  if (!slug) {
    return session;
  }

  const dispensary = await prisma.dispensary.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (!dispensary) {
    return session;
  }

  const effectiveRole = await getEffectiveRoleForDispensary(
    { user: session.user } as Parameters<typeof getEffectiveRoleForDispensary>[0],
    dispensary.id,
  );

  return {
    ...session,
    tenant: {
      dispensaryId: dispensary.id,
      dispensarySlug: dispensary.slug,
      effectiveRole,
    },
  };
}

export async function assertTenantAccessInMiddleware(
  session: AppMiddlewareSession,
): Promise<boolean> {
  if (!session?.tenant || !session.user?.id) {
    return false;
  }
  return userCanAccessDispensary(
    { user: session.user } as Parameters<typeof userCanAccessDispensary>[0],
    session.tenant.dispensaryId,
  );
}
