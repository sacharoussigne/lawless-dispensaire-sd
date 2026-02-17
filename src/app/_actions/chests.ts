'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

// Schéma de validation pour créer un coffre
const createChestSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
});

// Schéma de validation pour modifier un coffre
const updateChestSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
});

// Schéma pour supprimer un coffre
const deleteChestSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Crée un nouveau coffre
 */
export async function createChest(data: {
  name: string;
  description?: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createChestSchema.parse(data);

    const chest = await prisma.chest.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
      },
    });

    return {
      status: 201,
      data: chest,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du coffre');
  }
}

/**
 * Récupère tous les coffres
 */
export async function getChests() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const chests = await prisma.chest.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        stockHistory: {
          select: {
            id: true,
          },
        },
      },
    });

    return {
      status: 200,
      data: chests,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des coffres');
  }
}

/**
 * Modifie un coffre existant
 */
export async function updateChest(data: {
  id: string;
  name: string;
  description?: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = updateChestSchema.parse(data);

    const chest = await prisma.chest.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        description: validatedData.description,
      },
    });

    return {
      status: 200,
      data: chest,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification du coffre');
  }
}

/**
 * Supprime un coffre
 */
export async function deleteChest(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteChestSchema.parse(data);

    await prisma.chest.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du coffre');
  }
}
