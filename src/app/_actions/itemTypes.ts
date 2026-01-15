'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

// Schéma de validation pour créer un itemType
const createItemTypeSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  shopIds: z.array(z.string().uuid('ID de magasin invalide')).optional(),
});

// Schéma de validation pour modifier un itemType
const updateItemTypeSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  shopIds: z.array(z.string().uuid('ID de magasin invalide')).optional(),
});

// Schéma pour supprimer un itemType
const deleteItemTypeSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Crée un nouveau type d'item
 */
export async function createItemType(data: {
  name: string;
  description?: string;
  shopIds?: string[];
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createItemTypeSchema.parse(data);

    const itemType = await prisma.itemType.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        shops: validatedData.shopIds
          ? {
              create: validatedData.shopIds.map((shopId) => ({
                shopId,
              })),
            }
          : undefined,
      },
      include: {
        items: {
          select: {
            id: true,
          },
        },
        shops: {
          select: {
            id: true,
            shopId: true,
          },
        },
      },
    });

    return {
      status: 201,
      data: itemType,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du type d\'item');
  }
}

/**
 * Récupère tous les types d'items
 */
export async function getItemTypes() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const itemTypes = await prisma.itemType.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: {
          select: {
            id: true,
          },
        },
        shops: {
          include: {
            shop: true
          }
        },
      },
    });

    return {
      status: 200,
      data: itemTypes,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des types d\'items');
  }
}

/**
 * Modifie un type d'item existant
 */
export async function updateItemType(data: {
  id: string;
  name: string;
  description?: string;
  shopIds?: string[];
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = updateItemTypeSchema.parse(data);

    // Récupérer les relations existantes
    const existingItemType = await prisma.itemType.findUnique({
      where: { id: validatedData.id },
      include: {
        shops: {
          select: {
            shopId: true,
          },
        },
      },
    });

    const existingShopIds = existingItemType?.shops.map((s) => s.shopId) || [];
    const newShopIds = validatedData.shopIds || [];
    const shopIdsToAdd = newShopIds.filter((id) => !existingShopIds.includes(id));
    const shopIdsToRemove = existingShopIds.filter((id) => !newShopIds.includes(id));

    const itemType = await prisma.itemType.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        shops: {
          deleteMany: shopIdsToRemove.length > 0 ? { shopId: { in: shopIdsToRemove } } : undefined,
          create: shopIdsToAdd.map((shopId) => ({
            shopId,
          })),
        },
      },
      include: {
        items: {
          select: {
            id: true,
          },
        },
        shops: {
          select: {
            id: true,
            shopId: true,
          },
        },
      },
    });

    return {
      status: 200,
      data: itemType,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification du type d\'item');
  }
}

/**
 * Supprime un type d'item
 */
export async function deleteItemType(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteItemTypeSchema.parse(data);

    await prisma.itemType.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du type d\'item');
  }
}

