'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

// Schéma de validation pour créer un shop
const createShopSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  locationId: z.string().uuid('La location est requise'),
});

// Schéma de validation pour modifier un shop
const updateShopSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  locationId: z.string().uuid('La location est requise'),
});

// Schéma pour supprimer un shop
const deleteShopSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Crée un nouveau shop
 */
export async function createShop(data: {
  name: string;
  locationId: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createShopSchema.parse(data);

    const shop = await prisma.shop.create({
      data: {
        name: validatedData.name,
        locationId: validatedData.locationId,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        shopGroups: {
          select: {
            id: true,
          },
        },
      },
    });

    return {
      status: 201,
      data: shop,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du magasin');
  }
}

/**
 * Récupère tous les shops
 */
export async function getShops() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const shops = await prisma.shop.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        shopGroups: {
          select: {
            id: true,
          },
        },
      },
    });

    return {
      status: 200,
      data: shops,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des magasins');
  }
}

/**
 * Modifie un shop existant
 */
export async function updateShop(data: {
  id: string;
  name: string;
  locationId: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = updateShopSchema.parse(data);

    const shop = await prisma.shop.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        locationId: validatedData.locationId,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        shopGroups: {
          select: {
            id: true,
          },
        },
      },
    });

    return {
      status: 200,
      data: shop,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification du magasin');
  }
}

/**
 * Supprime un shop
 */
export async function deleteShop(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteShopSchema.parse(data);

    await prisma.shop.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du magasin');
  }
}

