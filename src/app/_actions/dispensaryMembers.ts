'use server';

import prisma from '@/lib/prisma';
import { z } from 'zod';
import { actionErrorParser } from '@/lib/action';
import { requireDispensaryAdminContext } from '@/lib/dispensary/serverActionContext';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

const roleEnum = z.enum([
  'user',
  'admin',
  'employee',
  'inventory_manager',
  'inventory_viewer',
  'private_practitioner',
  'direction',
]);

const upsertMemberSchema = z.object({
  userId: z.string().min(1),
  role: roleEnum,
});

export async function listDispensaryMembers(dispensarySlug: string) {
  const auth = await requireDispensaryAdminContext(dispensarySlug);
  if (!auth.ok) {
    return { status: auth.status, error: auth.error };
  }

  const members = await prisma.dispensaryMember.findMany({
    where: { dispensaryId: auth.ctx.dispensaryId },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });

  return { status: 200, data: members };
}

export async function upsertDispensaryMember(
  dispensarySlug: string,
  data: { userId: string; role: z.infer<typeof roleEnum> },
) {
  try {
    const auth = await requireDispensaryAdminContext(dispensarySlug);
    if (!auth.ok) {
      return { status: auth.status, error: auth.error };
    }

    const validated = upsertMemberSchema.parse(data);
    const user = await prisma.user.findUnique({ where: { id: validated.userId } });
    if (!user) {
      return { status: 404, error: 'Utilisateur introuvable' };
    }

    const member = await prisma.dispensaryMember.upsert({
      where: {
        dispensaryId_userId: {
          dispensaryId: auth.ctx.dispensaryId,
          userId: validated.userId,
        },
      },
      create: {
        dispensaryId: auth.ctx.dispensaryId,
        userId: validated.userId,
        role: validated.role,
      },
      update: { role: validated.role },
    });

    return { status: 200, data: member };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour du membre');
  }
}

export async function removeDispensaryMember(dispensarySlug: string, userId: string) {
  try {
    const auth = await requireDispensaryAdminContext(dispensarySlug);
    if (!auth.ok) {
      return { status: auth.status, error: auth.error };
    }

    await prisma.dispensaryMember.deleteMany({
      where: {
        userId,
        ...tenantWhere(auth.ctx.dispensaryId),
      },
    });

    return { status: 200 };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du membre');
  }
}

export async function searchUsersForDispensaryInvite(dispensarySlug: string, query: string) {
  const auth = await requireDispensaryAdminContext(dispensarySlug);
  if (!auth.ok) {
    return { status: auth.status, error: auth.error };
  }

  const q = query.trim();
  if (q.length < 2) {
    return { status: 200, data: [] };
  }

  const users = await prisma.user.findMany({
    where: {
      name: { contains: q, mode: 'insensitive' },
    },
    select: { id: true, name: true },
    take: 20,
  });

  return { status: 200, data: users };
}
