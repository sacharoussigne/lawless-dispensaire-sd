'use server';

import { auth, getAuthSession } from '@/lib/auth';
import { headers } from 'next/headers';
import { z } from 'zod/v3';
import { actionErrorParser } from '@/lib/action';

const updateMyProfileSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  image: z
    .string()
    .nullable()
    .optional()
    .refine((value) => {
      if (value === undefined || value === null || value.length === 0) return true;

      if (value.startsWith('data:image/')) {
        const match = value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
        if (!match) return false;

        const base64 = match[2] ?? '';
        const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
        const bytes = Math.floor((base64.length * 3) / 4) - padding;
        return bytes <= 1_000_000;
      }

      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, 'Image invalide (URL ou Data URL base64 ≤ 1MB)'),
});

export async function updateMyProfile(data: z.infer<typeof updateMyProfileSchema>) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return { status: 401, error: 'Non autorisé' };
    }

    const validated = updateMyProfileSchema.parse(data);

    const result = await auth.api.updateUser({
      body: {
        name: validated.name,
        image: validated.image === undefined ? undefined : validated.image,
      },
      headers: await headers(),
    });

    return { status: 200, data: result };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour du profil');
  }
}

const changeMyPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

export async function changeMyPassword(data: z.infer<typeof changeMyPasswordSchema>) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return { status: 401, error: 'Non autorisé' };
    }

    const validated = changeMyPasswordSchema.parse(data);

    const result = await auth.api.changePassword({
      body: {
        currentPassword: validated.currentPassword,
        newPassword: validated.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });

    return { status: 200, data: result };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du changement de mot de passe');
  }
}

