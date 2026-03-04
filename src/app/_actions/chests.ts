'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

const createChestSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  isEnabled: z.boolean().default(true),
});

const updateChestSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  isEnabled: z.boolean(),
});

const deleteChestSchema = z.object({
  id: z.string().uuid('ID invalide'),
  targetChestId: z.string().uuid('ID de coffre de destination invalide'),
});

const reorderChestsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid('ID invalide'),
    order: z.number().int(),
  })),
});

/**
 * Creates a new chest
 */
export async function createChest(data: {
  name: string;
  description?: string;
  isEnabled?: boolean;
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

    // Get the maximum current order to place the new chest last
    const maxOrderResult = await prisma.chest.aggregate({
      _max: {
        order: true,
      },
    });
    const maxOrder = maxOrderResult._max.order ?? -1;
    const newOrder = maxOrder + 1;

    const chest = await prisma.chest.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        isEnabled: validatedData.isEnabled ?? true,
        order: newOrder,
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
 * Gets all chests
 * @param onlyEnabled
 */
export async function getChests(onlyEnabled: boolean = false) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const chests = await prisma.chest.findMany({
      where: onlyEnabled ? { isEnabled: true } : undefined,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
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
 * Updates an existing chest
 */
export async function updateChest(data: {
  id: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
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
        isEnabled: validatedData.isEnabled,
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
 * Deletes a chest and transfers stocks to another chest
 */
export async function deleteChest(data: { id: string; targetChestId: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteChestSchema.parse(data);

    const totalChests = await prisma.chest.count();
    if (totalChests <= 1) {
      return {
        status: 400,
        error: 'Impossible de supprimer le dernier coffre. Il doit y avoir au moins un coffre.',
      };
    }

    if (validatedData.id === validatedData.targetChestId) {
      return {
        status: 400,
        error: 'Le coffre de destination doit être différent du coffre à supprimer.',
      };
    }

    const targetChest = await prisma.chest.findUnique({
      where: { id: validatedData.targetChestId },
    });

    if (!targetChest) {
      return {
        status: 404,
        error: 'Le coffre de destination n\'existe pas.',
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockHistory.updateMany({
        where: {
          chestId: validatedData.id,
        },
        data: {
          chestId: validatedData.targetChestId,
        },
      });

      await tx.chest.delete({
        where: {
          id: validatedData.id,
        },
      });
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du coffre');
  }
}

/**
 * Reorders chests
 */
export async function reorderChests(data: { items: { id: string; order: number }[] }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = reorderChestsSchema.parse(data);

    // Update the order of each chest
    await Promise.all(
      validatedData.items.map(({ id, order }) =>
        prisma.chest.update({
          where: { id },
          data: { order },
        })
      )
    );

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du réordonnancement des coffres');
  }
}
