'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

// Schéma de validation pour créer une recette de craft
const createCraftRecipeSchema = z.object({
  recipeName: z.string().min(1, 'Le nom de la recette est requis').max(255, 'Le nom est trop long'),
  recipeDescription: z.string().max(1000, 'La description est trop longue').optional(),
  craftedItemId: z.string().uuid('ID d\'item invalide'),
  quantity: z.number().int().min(1, 'La quantité doit être au moins 1'),
  ingredients: z.array(z.object({
    usedItemId: z.string().uuid('ID d\'item invalide'),
    quantity: z.number().int().min(1, 'La quantité doit être au moins 1'),
  })).min(1, 'Au moins un ingrédient est requis'),
});

// Schéma de validation pour modifier une recette de craft
const updateCraftRecipeSchema = z.object({
  id: z.string().uuid('ID invalide'),
  recipeName: z.string().min(1, 'Le nom de la recette est requis').max(255, 'Le nom est trop long'),
  recipeDescription: z.string().max(1000, 'La description est trop longue').optional(),
  quantity: z.number().int().min(1, 'La quantité doit être au moins 1'),
  ingredients: z.array(z.object({
    usedItemId: z.string().uuid('ID d\'item invalide'),
    quantity: z.number().int().min(1, 'La quantité doit être au moins 1'),
  })).min(1, 'Au moins un ingrédient est requis'),
});

// Schéma pour supprimer une recette de craft
const deleteCraftRecipeSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Récupère toutes les recettes de craft pour un item
 */
export async function getCraftRecipesByItemId(itemId: string) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const craftRecipes = await prisma.craftRecipe.findMany({
      where: {
        craftedItemId: itemId,
      },
      include: {
        ingredients: {
          include: {
            usedItem: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      status: 200,
      data: craftRecipes,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des recettes de craft');
  }
}

/**
 * Crée une nouvelle recette de craft
 */
export async function createCraftRecipe(data: {
  recipeName: string;
  recipeDescription?: string;
  craftedItemId: string;
  quantity: number;
  ingredients: { usedItemId: string; quantity: number }[];
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createCraftRecipeSchema.parse(data);

    const craftRecipe = await prisma.craftRecipe.create({
      data: {
        recipeName: validatedData.recipeName,
        recipeDescription: validatedData.recipeDescription,
        craftedItemId: validatedData.craftedItemId,
        quantity: validatedData.quantity,
        ingredients: {
          create: validatedData.ingredients.map((ing) => ({
            usedItemId: ing.usedItemId,
            quantity: ing.quantity,
          })),
        },
      },
      include: {
        ingredients: {
          include: {
            usedItem: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      status: 201,
      data: craftRecipe,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de la recette de craft');
  }
}

/**
 * Modifie une recette de craft existante
 */
export async function updateCraftRecipe(data: {
  id: string;
  recipeName: string;
  recipeDescription?: string;
  quantity: number;
  ingredients: { usedItemId: string; quantity: number }[];
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = updateCraftRecipeSchema.parse(data);

    // Supprimer les anciens ingrédients
    await prisma.craftRecipeItem.deleteMany({
      where: {
        craftRecipeId: validatedData.id,
      },
    });

    // Mettre à jour la recette et créer les nouveaux ingrédients
    const craftRecipe = await prisma.craftRecipe.update({
      where: {
        id: validatedData.id,
      },
      data: {
        recipeName: validatedData.recipeName,
        recipeDescription: validatedData.recipeDescription,
        quantity: validatedData.quantity,
        ingredients: {
          create: validatedData.ingredients.map((ing) => ({
            usedItemId: ing.usedItemId,
            quantity: ing.quantity,
          })),
        },
      },
      include: {
        ingredients: {
          include: {
            usedItem: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      status: 200,
      data: craftRecipe,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification de la recette de craft');
  }
}

/**
 * Supprime une recette de craft
 */
export async function deleteCraftRecipe(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteCraftRecipeSchema.parse(data);

    await prisma.craftRecipe.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la recette de craft');
  }
}

