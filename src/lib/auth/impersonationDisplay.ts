import prisma from '@/lib/prisma';

/** Display name for the admin session stored in Session.impersonatedBy (real account when impersonating). */
export async function getImpersonatorDisplayName(
  impersonatorUserId: string | null | undefined
): Promise<string | null> {
  if (!impersonatorUserId) return null;
  const user = await prisma.user.findUnique({
    where: { id: impersonatorUserId },
    select: { name: true },
  });
  return user?.name ?? null;
}
