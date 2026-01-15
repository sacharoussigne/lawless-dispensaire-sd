'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

// Schéma de validation pour créer un groupe de magasins
const createShopGroupSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  shopIds: z.array(z.string().uuid('ID de magasin invalide')).optional(),
});

// Schéma de validation pour modifier un groupe de magasins
const updateShopGroupSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  shopIds: z.array(z.string().uuid('ID de magasin invalide')).optional(),
});

// Schéma pour supprimer un groupe de magasins
const deleteShopGroupSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Crée un nouveau groupe de magasins
 */
export async function createShopGroup(data: {
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

    const validatedData = createShopGroupSchema.parse(data);

    const shopGroup = await prisma.shopGroup.create({
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
          include: {
            shop: {
              include: {
                location: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      status: 201,
      data: shopGroup,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du groupe de magasins');
  }
}

/**
 * Récupère tous les groupes de magasins
 */
export async function getShopGroups() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const shopGroups = await prisma.shopGroup.findMany({
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
            shop: {
              include: {
                location: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      status: 200,
      data: shopGroups,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des groupes de magasins');
  }
}

/**
 * Modifie un groupe de magasins existant
 */
export async function updateShopGroup(data: {
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

    const validatedData = updateShopGroupSchema.parse(data);

    // Récupérer les relations existantes
    const existingShopGroup = await prisma.shopGroup.findUnique({
      where: { id: validatedData.id },
      include: {
        shops: {
          select: {
            shopId: true,
          },
        },
      },
    });

    const existingShopIds = existingShopGroup?.shops.map((s) => s.shopId) || [];
    const newShopIds = validatedData.shopIds || [];
    const shopIdsToAdd = newShopIds.filter((id) => !existingShopIds.includes(id));
    const shopIdsToRemove = existingShopIds.filter((id) => !newShopIds.includes(id));

    const shopGroup = await prisma.shopGroup.update({
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
          include: {
            shop: {
              include: {
                location: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      status: 200,
      data: shopGroup,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification du groupe de magasins');
  }
}

/**
 * Supprime un groupe de magasins
 */
export async function deleteShopGroup(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteShopGroupSchema.parse(data);

    await prisma.shopGroup.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du groupe de magasins');
  }
}

