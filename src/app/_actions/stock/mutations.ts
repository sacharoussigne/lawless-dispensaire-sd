'use server';

import { StockMovementKind } from '@prisma/client';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import { getTodayStart, getTomorrowStart, getYesterdayStart, getStartOfDay } from '@/lib/date';
import { getDefaultChestId } from '@/app/_actions/stock/internals';
import { buildManualMovements } from '@/lib/stock/movements';

export async function updateStock(
  dispensarySlug: string,
  data: { itemId: string; quantity: number }[],
  chestId?: string | null,
  options?: { skipHistory?: boolean },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'stock',
      permission: {
        resource: 'stock',
        action: 'update',
        message: 'Permission refusée : vous n\'avez pas la permission de mettre à jour le stock',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;
    const { session } = ctx;

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();
    const yesterday = getYesterdayStart();
    const skipHistory = options?.skipHistory ?? false;
    const userId = session.user.id;

    let targetChestId = chestId;
    if (!targetChestId) {
      try {
        targetChestId = await getDefaultChestId(dispensaryId);
      } catch {
        return {
          status: 404,
          error: 'Coffre par défaut "Foure tout" non trouvé ou désactivé',
        };
      }
    }

    const results = await prisma.$transaction(async (tx) => {
      const movementInputs: {
        itemId: string;
        newQty: number;
        stockToday: number | null;
        stockYesterday: number | null;
      }[] = [];

      const stockResults = await Promise.all(
        data.map(async ({ itemId, quantity }) => {
          const existingStock = await tx.stockHistory.findFirst({
            where: {
              itemId,
              chestId: targetChestId!,
              timestamp: {
                gte: today,
                lt: tomorrow,
              },
            },
            orderBy: {
              timestamp: 'desc',
            },
          });

          const yesterdayStock = await tx.stockHistory.findFirst({
            where: {
              itemId,
              chestId: targetChestId!,
              timestamp: {
                gte: yesterday,
                lt: today,
              },
            },
            orderBy: {
              timestamp: 'desc',
            },
          });

          movementInputs.push({
            itemId,
            newQty: quantity,
            stockToday: existingStock?.quantity ?? null,
            stockYesterday: yesterdayStock?.quantity ?? null,
          });

          if (existingStock) {
            return tx.stockHistory.update({
              where: { id: existingStock.id },
              data: { quantity },
            });
          }

          return tx.stockHistory.create({
            data: {
              itemId,
              chestId: targetChestId!,
              quantity,
            },
          });
        }),
      );

      const movements = buildManualMovements(movementInputs, skipHistory);
      if (movements.length > 0) {
        await tx.stockItemMovement.createMany({
          data: movements.map((m) => ({
            itemId: m.itemId,
            quantity: m.quantity,
            kind: m.kind,
            userId,
          })),
        });
      }

      return stockResults;
    });

    return {
      status: 200,
      data: results,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour du stock');
  }
}

export async function craftItem(
  dispensarySlug: string,
  data: {
    craftedItemId: string;
    recipeId: string;
    times: number;
    sourceChestId: string | null;
    ingredientChests: { ingredientId: string; chestId: string }[];
    destinationChestId: string | null;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'stock',
      permission: {
        resource: 'stock',
        action: 'craft-write',
        message: 'Permission refusée : vous n\'avez pas la permission d\'effectuer un craft',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;
    const { session } = ctx;

    const destinationChestId = data.destinationChestId || await getDefaultChestId(dispensaryId);

    const recipe = await prisma.craftRecipe.findFirst({
      where: { id: data.recipeId, ...tenantWhere(dispensaryId) },
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
      }),
    );

    const allHaveEnough = ingredientChecks.every((check) => check.hasEnough);
    if (!allHaveEnough) {
      return {
        status: 400,
        error: 'Stock insuffisant pour certains ingrédients',
        data: ingredientChecks,
      };
    }

    const userId = session.user.id;

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

      await tx.stockItemMovement.create({
        data: {
          itemId: data.craftedItemId,
          quantity: totalQuantityProduced,
          kind: StockMovementKind.CRAFT_PRODUCE,
          userId,
        },
      });

      for (const ingredient of recipe.ingredients) {
        const requiredQuantity = ingredient.quantity * data.times;
        await tx.stockItemMovement.create({
          data: {
            itemId: ingredient.usedItemId,
            quantity: -requiredQuantity,
            kind: StockMovementKind.CRAFT_CONSUME,
            userId,
          },
        });
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

export async function overwriteStockForDate(
  dispensarySlug: string,
  data: {
    date: Date;
    stocks: { itemId: string; quantity: number }[];
    chestId?: string | null;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'stock',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const dayStart = getStartOfDay(data.date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const targetChestId = data.chestId || await getDefaultChestId(dispensaryId);

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
        }),
    );

    return {
      status: 200,
      data: results,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de l\'écrasement des stocks');
  }
}
