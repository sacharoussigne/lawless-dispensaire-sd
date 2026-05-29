'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { actionErrorParser } from '@/lib/action';
import { requirePlatformAdminContext } from '@/lib/dispensary/serverActionContext';
import { slugifyDispensaryName } from '@/lib/dispensary/slug';
import { APP_SETTINGS_DEFAULTS } from '@/lib/appSettingsShared';

const createDispensarySchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(80).optional(),
});

export async function listDispensariesForPlatform() {
  const auth = await requirePlatformAdminContext();
  if (!auth.ok) {
    return { status: auth.status, error: auth.error };
  }
  const rows = await prisma.dispensary.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { members: true } },
      settings: { select: { dispensaryName: true } },
    },
  });
  return { status: 200, data: rows };
}

export async function createDispensary(data: { name: string; slug?: string }) {
  try {
    const auth = await requirePlatformAdminContext();
    if (!auth.ok) {
      return { status: auth.status, error: auth.error };
    }

    const validated = createDispensarySchema.parse(data);
    const slug = validated.slug?.trim() || slugifyDispensaryName(validated.name);

    const existing = await prisma.dispensary.findUnique({ where: { slug } });
    if (existing) {
      return { status: 409, error: 'Ce slug est déjà utilisé' };
    }

    const dispensary = await prisma.dispensary.create({
      data: {
        name: validated.name.trim(),
        slug,
        createdById: auth.userId,
        settings: {
          create: {
            ...APP_SETTINGS_DEFAULTS,
            dispensaryName: validated.name.trim(),
          },
        },
        members: {
          create: {
            userId: auth.userId,
            role: 'admin',
          },
        },
      },
    });

    revalidatePath('/platform/dispensaries');
    return { status: 201, data: dispensary };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du dispensaire');
  }
}
