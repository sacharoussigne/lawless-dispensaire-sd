'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

const createCraftRecipeSchema = z.object({
  name: z.string().min(1, 'Le nom de la recette est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  craftedItemId: z.string().uuid('ID d\'item invalide'),
  quantity: z.number().int().min(1, 'La quantité doit être au moins 1'),
  isEnabled: z.boolean().default(true),
  ingredients: z.array(z.object({
    usedItemId: z.string().uuid('ID d\'item invalide'),
    quantity: z.number().int().min(1, 'La quantité doit être au moins 1'),
  })).min(1, 'Au moins un ingrédient est requis'),
});

const updateCraftRecipeSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom de la recette est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  quantity: z.number().int().min(1, 'La quantité doit être au moins 1'),
  isEnabled: z.boolean().default(true),
  ingredients: z.array(z.object({
    usedItemId: z.string().uuid('ID d\'item invalide'),
    quantity: z.number().int().min(1, 'La quantité doit être au moins 1'),
  })).min(1, 'Au moins un ingrédient est requis'),
});

const deleteCraftRecipeSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

async function validateCraftRecipeItems(
  dispensaryId: string,
  craftedItemId: string,
  ingredientItemIds: string[],
): Promise<{ ok: true } | { ok: false; response: { status: number; error: string } }> {
  const allItemIds = Array.from(new Set([craftedItemId, ...ingredientItemIds]));

  const items = await prisma.item.findMany({
    where: {
      id: { in: allItemIds },
      ...tenantWhere(dispensaryId),
    },
    select: { id: true },
  });

  if (items.length !== allItemIds.length) {
    return { ok: false, response: { status: 400, error: 'Un ou plusieurs objets sont invalides' } };
  }

  return { ok: true };
}

export async function getCraftRecipesByItemId(
  dispensarySlug: string,
  itemId: string,
  onlyEnabled: boolean = false,
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const item = await prisma.item.findFirst({
      where: { id: itemId, ...tenantWhere(dispensaryId) },
    });
    if (!item) {
      return { status: 404, error: 'Objet introuvable' };
    }

    const craftRecipes = await prisma.craftRecipe.findMany({
      where: {
        craftedItemId: itemId,
        ...tenantWhere(dispensaryId),
        ...(onlyEnabled && { isEnabled: true }),
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

export async function createCraftRecipe(
  dispensarySlug: string,
  data: {
    name: string;
    description?: string;
    craftedItemId: string;
    quantity: number;
    isEnabled?: boolean;
    ingredients: { usedItemId: string; quantity: number }[];
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = createCraftRecipeSchema.parse(data);

    const itemsResult = await validateCraftRecipeItems(
      dispensaryId,
      validatedData.craftedItemId,
      validatedData.ingredients.map((ing) => ing.usedItemId),
    );
    if (!itemsResult.ok) return itemsResult.response;

    const craftRecipe = await prisma.craftRecipe.create({
      data: {
        dispensaryId,
        name: validatedData.name,
        description: validatedData.description,
        craftedItemId: validatedData.craftedItemId,
        quantity: validatedData.quantity,
        isEnabled: validatedData.isEnabled ?? true,
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

export async function updateCraftRecipe(
  dispensarySlug: string,
  data: {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    isEnabled?: boolean;
    ingredients: { usedItemId: string; quantity: number }[];
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = updateCraftRecipeSchema.parse(data);

    const existingRecipe = await prisma.craftRecipe.findFirst({
      where: { id: validatedData.id, ...tenantWhere(dispensaryId) },
      select: { craftedItemId: true },
    });
    if (!existingRecipe) {
      return { status: 404, error: 'Recette de craft introuvable' };
    }

    const itemsResult = await validateCraftRecipeItems(
      dispensaryId,
      existingRecipe.craftedItemId,
      validatedData.ingredients.map((ing) => ing.usedItemId),
    );
    if (!itemsResult.ok) return itemsResult.response;

    await prisma.craftRecipeItem.deleteMany({
      where: {
        craftRecipeId: validatedData.id,
        craftRecipe: tenantWhere(dispensaryId),
      },
    });

    const craftRecipe = await prisma.craftRecipe.update({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        quantity: validatedData.quantity,
        isEnabled: validatedData.isEnabled ?? true,
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

export async function deleteCraftRecipe(dispensarySlug: string, data: { id: string }) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = deleteCraftRecipeSchema.parse(data);

    await prisma.craftRecipe.delete({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
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
