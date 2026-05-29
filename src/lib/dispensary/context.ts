import { cache } from 'react';
import prisma from '@/lib/prisma';
type SessionLike = {
  user: { id: string; role?: string | null };
} | null;
import { isPlatformAdmin } from '@/lib/dispensary/platformAdmin';
import { hasRole } from '@/lib/auth/permissions';
import { Role } from '@/types/enum/roles';

export type DispensaryContext = {
  id: string;
  slug: string;
  name: string;
};

export const resolveDispensaryFromSlug = cache(async (slug: string): Promise<DispensaryContext | null> => {
  const row = await prisma.dispensary.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  return row;
});

export async function getMemberRole(
  userId: string,
  dispensaryId: string,
): Promise<string | null> {
  const member = await prisma.dispensaryMember.findUnique({
    where: {
      dispensaryId_userId: { dispensaryId, userId },
    },
    select: { role: true },
  });
  return member?.role ?? null;
}

export async function getEffectiveRoleForDispensary(
  session: SessionLike,
  dispensaryId: string,
): Promise<string | null> {
  if (!session?.user?.id) {
    return null;
  }
  if (isPlatformAdmin(session.user.role)) {
    return Role.ADMIN;
  }
  return getMemberRole(session.user.id, dispensaryId);
}

export async function userCanAccessDispensary(
  session: SessionLike,
  dispensaryId: string,
): Promise<boolean> {
  if (!session?.user?.id) {
    return false;
  }
  if (isPlatformAdmin(session.user.role)) {
    return true;
  }
  const member = await prisma.dispensaryMember.findUnique({
    where: {
      dispensaryId_userId: { dispensaryId, userId: session.user.id },
    },
    select: { id: true },
  });
  return member != null;
}

export async function requireDispensaryFromSlug(slug: string): Promise<DispensaryContext> {
  const dispensary = await resolveDispensaryFromSlug(slug);
  if (!dispensary) {
    throw new Error('DISPENSARY_NOT_FOUND');
  }
  return dispensary;
}

export async function requireDispensaryAccess(
  session: SessionLike,
  slug: string,
): Promise<{ dispensary: DispensaryContext; effectiveRole: string | null }> {
  const dispensary = await requireDispensaryFromSlug(slug);
  const allowed = await userCanAccessDispensary(session, dispensary.id);
  if (!allowed) {
    throw new Error('DISPENSARY_ACCESS_DENIED');
  }
  const effectiveRole = await getEffectiveRoleForDispensary(session, dispensary.id);
  return { dispensary, effectiveRole };
}

export async function listAccessibleDispensaries(session: SessionLike) {
  if (!session?.user?.id) {
    return [];
  }
  const select = {
    id: true,
    slug: true,
    name: true,
    settings: { select: { dispensaryName: true } },
  } as const;

  const rows = isPlatformAdmin(session.user.role)
    ? await prisma.dispensary.findMany({ orderBy: { name: 'asc' }, select })
    : await prisma.dispensary.findMany({
        where: { members: { some: { userId: session.user.id } } },
        orderBy: { name: 'asc' },
        select,
      });

  return rows.map((d) => ({
    id: d.id,
    slug: d.slug,
    name: d.settings?.dispensaryName?.trim() || d.name,
  }));
}

export function isDispensaryAdminRole(role: string | null | undefined): boolean {
  return hasRole(role, Role.ADMIN);
}
