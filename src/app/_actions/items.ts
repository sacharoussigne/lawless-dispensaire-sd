'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

// Schéma de validation pour créer un item
const createItemSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  idealQuantity: z.number().int().min(0, 'La quantité idéale doit être positive'),
  isCraftable: z.boolean().default(false),
  categoryId: z.string().uuid('ID de catégorie invalide').min(1, 'La catégorie est requise'),
  companyGroupId: z.string().uuid('ID de groupe d\'entreprise invalide').optional(),
});

// Schéma de validation pour modifier un item
const updateItemSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  idealQuantity: z.number().int().min(0, 'La quantité idéale doit être positive'),
  isCraftable: z.boolean().default(false),
  categoryId: z.string().uuid('ID de catégorie invalide').min(1, 'La catégorie est requise'),
  companyGroupId: z.string().uuid('ID de groupe d\'entreprise invalide').optional(),
});

// Schéma pour supprimer un item
const deleteItemSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Crée un nouvel item
 */
export async function createItem(data: {
  name: string;
  description?: string;
  idealQuantity: number;
  isCraftable?: boolean;
  categoryId: string;
  companyGroupId?: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createItemSchema.parse(data);

    // Récupérer le dernier ordre pour cette catégorie
    const lastItem = await prisma.item.findFirst({
      where: {
        categoryId: validatedData.categoryId,
      },
      orderBy: {
        order: 'desc',
      },
      select: {
        order: true,
      },
    });

    const newOrder = lastItem ? lastItem.order + 1 : 0;

    const item = await prisma.item.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        idealQuantity: validatedData.idealQuantity,
        isCraftable: validatedData.isCraftable ?? false,
        categoryId: validatedData.categoryId,
        companyGroupId: validatedData.companyGroupId,
        order: newOrder,
      },
    });

    return {
      status: 201,
      data: item,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de l\'objet');
  }
}

/**
 * Récupère tous les items
 */
export async function getItems() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const items = await prisma.item.findMany({
      orderBy: [
        {
          category: {
            order: 'asc',
          },
        },
        {
          order: 'asc',
        },
        {
          name: 'asc',
        },
      ],
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
          },
        },
        companyGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      status: 200,
      data: items,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des objets');
  }
}

/**
 * Modifie un item existant
 */
export async function updateItem(data: {
  id: string;
  name: string;
  description?: string;
  idealQuantity: number;
  isCraftable?: boolean;
  categoryId: string;
  companyGroupId?: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = updateItemSchema.parse(data);

    const item = await prisma.item.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        idealQuantity: validatedData.idealQuantity,
        isCraftable: validatedData.isCraftable ?? false,
        categoryId: validatedData.categoryId,
        companyGroupId: validatedData.companyGroupId,
      },
    });

    return {
      status: 200,
      data: item,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification de l\'objet');
  }
}

/**
 * Supprime un item
 */
export async function deleteItem(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteItemSchema.parse(data);

    await prisma.item.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de l\'objet');
  }
}

// Schéma pour réordonner les items
const reorderItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid('ID invalide'),
    order: z.number().int(),
  })),
});

/**
 * Réordonne les items
 */
export async function reorderItems(data: { items: { id: string; order: number }[] }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = reorderItemsSchema.parse(data);

    // Mettre à jour l'ordre de chaque item
    await Promise.all(
      validatedData.items.map(({ id, order }) =>
        prisma.item.update({
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
    return actionErrorParser(error, 'Erreur lors du réordonnancement des objets');
  }
}

