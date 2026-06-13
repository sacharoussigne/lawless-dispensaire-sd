'use server';

import { StockMovementKind } from '@prisma/client';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import { getTodayStart, getTomorrowStart, getYesterdayStart, getStartOfDay } from '@/lib/date';
import { getDefaultChestId } from '@/app/_actions/stock/internals';
import { buildManualMovements, type ManualStockMovementInput } from '@/lib/stock/movements';

function latestStockByItem<T extends { itemId: string; timestamp: Date }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (!map.has(row.itemId)) {
      map.set(row.itemId, row);
    }
  }
  return map;
}

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

    if (data.length === 0) {
      return { status: 200, data: [] };
    }

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

    if (!targetChestId) {
      return {
        status: 404,
        error: 'Coffre cible introuvable',
      };
    }

    const resolvedChestId = targetChestId;

    const itemIds = data.map((d) => d.itemId);

    const results = await prisma.$transaction(async (tx) => {
      const [todayRows, yesterdayRows] = await Promise.all([
        tx.stockHistory.findMany({
          where: {
            itemId: { in: itemIds },
            chestId: resolvedChestId,
            timestamp: { gte: today, lt: tomorrow },
          },
          orderBy: { timestamp: 'desc' },
        }),
        tx.stockHistory.findMany({
          where: {
            itemId: { in: itemIds },
            chestId: resolvedChestId,
            timestamp: { gte: yesterday, lt: today },
          },
          orderBy: { timestamp: 'desc' },
        }),
      ]);

      const todayByItem = latestStockByItem(todayRows);
      const yesterdayByItem = latestStockByItem(yesterdayRows);

      const movementInputs: ManualStockMovementInput[] = data.map(({ itemId, quantity }) => ({
        itemId,
        newQty: quantity,
        stockToday: todayByItem.get(itemId)?.quantity ?? null,
        stockYesterday: yesterdayByItem.get(itemId)?.quantity ?? null,
      }));

      const stockResults = await Promise.all(
        data.map(async ({ itemId, quantity }) => {
          const existingStock = todayByItem.get(itemId);
          if (existingStock) {
            return tx.stockHistory.update({
              where: { id: existingStock.id },
              data: { quantity },
            });
          }
          return tx.stockHistory.create({
            data: {
              itemId,
              chestId: resolvedChestId,
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
      include: { ingredients: true },
    });

    if (!recipe) {
      return { status: 404, error: 'Recette non trouvée' };
    }

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();
    const totalQuantityProduced = recipe.quantity * data.times;

    const ingredientChestMap = new Map<string, string>();
    data.ingredientChests.forEach(({ ingredientId, chestId }) => {
      ingredientChestMap.set(ingredientId, chestId);
    });

    const ingredientRequirements = recipe.ingredients.map((ingredient) => {
      const sourceChestId = ingredientChestMap.get(ingredient.id) || data.sourceChestId;
      return {
        ingredient,
        requiredQuantity: ingredient.quantity * data.times,
        sourceChestId,
      };
    });

    const missingChest = ingredientRequirements.find((r) => !r.sourceChestId);
    if (missingChest) {
      return {
        status: 400,
        error: 'Stock insuffisant pour certains ingrédients',
        data: [{
          itemId: missingChest.ingredient.usedItemId,
          ingredientId: missingChest.ingredient.id,
          available: 0,
          required: missingChest.requiredQuantity,
          hasEnough: false,
          error: 'Aucun coffre source sélectionné',
        }],
      };
    }

    const stockLookups = ingredientRequirements.map((r) => {
      const chestId = r.sourceChestId;
      if (!chestId) throw new Error('Unexpected missing sourceChestId');
      return {
        itemId: r.ingredient.usedItemId,
        chestId,
      };
    });
    stockLookups.push({ itemId: data.craftedItemId, chestId: destinationChestId });

    const stockRows = await prisma.stockHistory.findMany({
      where: {
        OR: stockLookups.map(({ itemId, chestId }) => ({
          itemId,
          chestId,
          timestamp: { gte: today, lt: tomorrow },
        })),
      },
      orderBy: { timestamp: 'desc' },
    });

    const stockKey = (itemId: string, chestId: string) => `${itemId}:${chestId}`;
    const latestStock = new Map<string, (typeof stockRows)[0]>();
    for (const row of stockRows) {
      const key = stockKey(row.itemId, row.chestId);
      if (!latestStock.has(key)) {
        latestStock.set(key, row);
      }
    }

    const ingredientChecks = ingredientRequirements.map(({ ingredient, requiredQuantity, sourceChestId }) => {
      if (!sourceChestId) {
        throw new Error('Unexpected missing sourceChestId');
      }
      const availableStock = latestStock.get(stockKey(ingredient.usedItemId, sourceChestId))?.quantity ?? 0;
      return {
        itemId: ingredient.usedItemId,
        ingredientId: ingredient.id,
        available: availableStock,
        required: requiredQuantity,
        hasEnough: availableStock >= requiredQuantity,
      };
    });

    if (!ingredientChecks.every((check) => check.hasEnough)) {
      return {
        status: 400,
        error: 'Stock insuffisant pour certains ingrédients',
        data: ingredientChecks,
      };
    }

    const userId = session.user.id;

    await prisma.$transaction(async (tx) => {
      const craftedStock = latestStock.get(stockKey(data.craftedItemId, destinationChestId));
      if (craftedStock) {
        await tx.stockHistory.update({
          where: { id: craftedStock.id },
          data: { quantity: craftedStock.quantity + totalQuantityProduced },
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

      for (const { ingredient, requiredQuantity, sourceChestId } of ingredientRequirements) {
        if (!sourceChestId) {
          throw new Error('Unexpected missing sourceChestId');
        }
        const existingIngredientStock = latestStock.get(stockKey(ingredient.usedItemId, sourceChestId));
        if (existingIngredientStock) {
          await tx.stockHistory.update({
            where: { id: existingIngredientStock.id },
            data: { quantity: existingIngredientStock.quantity - requiredQuantity },
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

      await tx.stockItemMovement.createMany({
        data: [
          {
            itemId: data.craftedItemId,
            quantity: totalQuantityProduced,
            kind: StockMovementKind.CRAFT_PRODUCE,
            userId,
          },
          ...ingredientRequirements.map(({ ingredient, requiredQuantity }) => ({
            itemId: ingredient.usedItemId,
            quantity: -requiredQuantity,
            kind: StockMovementKind.CRAFT_CONSUME,
            userId,
          })),
        ],
      });
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
    const stocksToWrite = data.stocks.filter(
      (stock) => stock.quantity !== null && stock.quantity !== undefined,
    );

    await prisma.$transaction(async (tx) => {
      await tx.stockHistory.deleteMany({
        where: {
          timestamp: { gte: dayStart, lt: dayEnd },
          chestId: targetChestId,
        },
      });

      if (stocksToWrite.length > 0) {
        await tx.stockHistory.createMany({
          data: stocksToWrite.map(({ itemId, quantity }) => ({
            itemId,
            chestId: targetChestId,
            quantity,
            timestamp: dayStart,
          })),
        });
      }
    });

    return {
      status: 200,
      data: { count: stocksToWrite.length },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de l\'écrasement des stocks');
  }
}
