'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { checkRolePermission } from '@/lib/auth/permissions';
import { getAppFeatureActionBlock } from '@/lib/appSettings';
import { getTodayStart, getTomorrowStart, getStartOfDay } from '@/lib/date';
import { getDefaultChestId } from '@/app/_actions/stock/internals';

export async function updateStock(data: { itemId: string; quantity: number }[], chestId?: string | null) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const featureBlock = await getAppFeatureActionBlock('stock');
    if (featureBlock) return featureBlock;

    const userRole = session.user?.role;
    if (!checkRolePermission(userRole, 'stock', 'update')) {
      return {
        status: 403,
        error: 'Permission refusée : vous n\'avez pas la permission de mettre à jour le stock',
      };
    }

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();

    let targetChestId = chestId;
    if (!targetChestId) {
      const defaultChest = await prisma.chest.findFirst({
        where: {
          name: 'Foure tout',
          isEnabled: true,
        },
      });
      if (!defaultChest) {
        return {
          status: 404,
          error: 'Coffre par défaut "Foure tout" non trouvé ou désactivé',
        };
      }
      targetChestId = defaultChest.id;
    }

    const results = await Promise.all(
      data.map(async ({ itemId, quantity }) => {
        const existingStock = await prisma.stockHistory.findFirst({
          where: {
            itemId,
            chestId: targetChestId,
            timestamp: {
              gte: today,
              lt: tomorrow,
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
        });

        if (existingStock) {
          return prisma.stockHistory.update({
            where: {
              id: existingStock.id,
            },
            data: {
              quantity,
            },
          });
        } else {
          return prisma.stockHistory.create({
            data: {
              itemId,
              chestId: targetChestId,
              quantity,
            },
          });
        }
      })
    );

    return {
      status: 200,
      data: results,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour du stock');
  }
}

/**
 * Performs a craft: adds the crafted item to stock and removes ingredients
 */

export async function craftItem(data: {
  craftedItemId: string;
  recipeId: string;
  times: number;
  sourceChestId: string | null;
  ingredientChests: { ingredientId: string; chestId: string }[];
  destinationChestId: string | null;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const featureBlock = await getAppFeatureActionBlock('stock');
    if (featureBlock) return featureBlock;

    const userRole = session.user?.role;
    if (!checkRolePermission(userRole, 'stock', 'craft-write')) {
      return {
        status: 403,
        error: 'Permission refusée : vous n\'avez pas la permission d\'effectuer un craft',
      };
    }

    // Determine the destination chest
    const destinationChestId = data.destinationChestId || await getDefaultChestId();

    const recipe = await prisma.craftRecipe.findUnique({
      where: { id: data.recipeId },
      include: {
        ingredients: true,
      },
    });

    if (!recipe) {
      return {
        status: 404,
        error: 'Recette non trouvée',
      };
    }

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();

    const totalQuantityProduced = recipe.quantity * data.times;

    const ingredientChestMap = new Map<string, string>();
    data.ingredientChests.forEach(({ ingredientId, chestId }) => {
      ingredientChestMap.set(ingredientId, chestId);
    });

    const ingredientChecks = await Promise.all(
      recipe.ingredients.map(async (ingredient) => {
        const requiredQuantity = ingredient.quantity * data.times;
        
        const sourceChestId = ingredientChestMap.get(ingredient.id) || data.sourceChestId;
        
        if (!sourceChestId) {
          return {
            itemId: ingredient.usedItemId,
            ingredientId: ingredient.id,
            available: 0,
            required: requiredQuantity,
            hasEnough: false,
            error: 'Aucun coffre source sélectionné',
          };
        }
        
        const stockToday = await prisma.stockHistory.findFirst({
          where: {
            itemId: ingredient.usedItemId,
            chestId: sourceChestId,
            timestamp: {
              gte: today,
              lt: tomorrow,
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
        });

        const availableStock = stockToday?.quantity ?? 0;

        if (availableStock < requiredQuantity) {
          return {
            itemId: ingredient.usedItemId,
            ingredientId: ingredient.id,
            available: availableStock,
            required: requiredQuantity,
            hasEnough: false,
          };
        }

        return {
          itemId: ingredient.usedItemId,
          ingredientId: ingredient.id,
          available: availableStock,
          required: requiredQuantity,
          hasEnough: true,
        };
      })
    );

    const allHaveEnough = ingredientChecks.every((check) => check.hasEnough);
    if (!allHaveEnough) {
      return {
        status: 400,
        error: 'Stock insuffisant pour certains ingrédients',
        data: ingredientChecks,
      };
    }

    await prisma.$transaction(async (tx) => {
      const existingCraftedStock = await tx.stockHistory.findFirst({
        where: {
          itemId: data.craftedItemId,
          chestId: destinationChestId,
          timestamp: {
            gte: today,
            lt: tomorrow,
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        });

        if (existingCraftedStock) {
          await tx.stockHistory.update({
          where: { id: existingCraftedStock.id },
          data: {
            quantity: existingCraftedStock.quantity + totalQuantityProduced,
            },
          });
        } else {
          await tx.stockHistory.create({
          data: {
            itemId: data.craftedItemId,
            chestId: destinationChestId,
            quantity: totalQuantityProduced,
          },
          });
        }

      for (const ingredient of recipe.ingredients) {
        const requiredQuantity = ingredient.quantity * data.times;
        
        const sourceChestId = ingredientChestMap.get(ingredient.id) || data.sourceChestId;
        
        if (!sourceChestId) {
          throw new Error(`Aucun coffre source pour l'ingrédient ${ingredient.id}`);
        }
        
        const existingIngredientStock = await tx.stockHistory.findFirst({
          where: {
            itemId: ingredient.usedItemId,
            chestId: sourceChestId,
            timestamp: {
              gte: today,
              lt: tomorrow,
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
        });

        if (existingIngredientStock) {
          const newQuantity = existingIngredientStock.quantity - requiredQuantity;
          await tx.stockHistory.update({
            where: { id: existingIngredientStock.id },
            data: {
              quantity: newQuantity,
            },
          });
        } else {
          await tx.stockHistory.create({
            data: {
              itemId: ingredient.usedItemId,
              chestId: sourceChestId,
              quantity: -requiredQuantity,
            },
          });
        }
      }
    });

    return {
      status: 200,
      data: { success: true, quantityProduced: totalQuantityProduced },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du craft');
  }
}

/**
 * Adds order items to today's stock
 * Adds quantities to existing stocks
 * @param orderId - Order ID
 * @param chestId - Chest ID where to add stocks (optional, uses "foure tout" by default)
 */

export async function overwriteStockForDate(data: {
  date: Date;
  stocks: { itemId: string; quantity: number }[];
  chestId?: string | null;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const featureBlock = await getAppFeatureActionBlock('stock');
    if (featureBlock) return featureBlock;

    const dayStart = getStartOfDay(data.date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const targetChestId = data.chestId || await getDefaultChestId();

    await prisma.stockHistory.deleteMany({
      where: {
        timestamp: {
          gte: dayStart,
          lt: dayEnd,
        },
        chestId: targetChestId,
      },
    });

    const results = await Promise.all(
      data.stocks
        .filter((stock) => stock.quantity !== null && stock.quantity !== undefined)
        .map(async ({ itemId, quantity }) => {
          return prisma.stockHistory.create({
            data: {
              itemId,
              chestId: targetChestId,
              quantity,
              timestamp: dayStart,
            },
          });
        })
    );

    return {
      status: 200,
      data: results,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de l\'écrasement des stocks');
  }
}

/**
 * Gets items with their detailed stocks by chest
 * Useful for item search with complete information
 */

