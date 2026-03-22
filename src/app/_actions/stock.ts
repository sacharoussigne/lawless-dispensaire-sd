'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { checkRolePermission } from '@/lib/auth/permissions';
import {
  getAppFeatureActionBlock,
  getAppFeaturesActionBlock,
} from '@/lib/appSettings';
import {
  getTodayStart,
  getYesterdayStart,
  getTomorrowStart,
  formatDate,
  getStartOfDay,
} from '@/lib/date';

/**
 * Gets the default "Foure tout" chest
 */
async function getDefaultChestId(): Promise<string> {
  const defaultChest = await prisma.chest.findFirst({
    where: {
      name: 'Foure tout',
      isEnabled: true,
    },
  });
  if (!defaultChest) {
    throw new Error('Coffre par défaut "Foure tout" non trouvé ou désactivé');
  }
  return defaultChest.id;
}

/**
 * Gets all items with their today's and yesterday's stocks
 * @param chestId - Chest ID to filter (optional, null for all chests)
 */
export async function getItemsWithStock(chestId?: string | null) {
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

    const today = getTodayStart();
    const yesterday = getYesterdayStart();
    const tomorrow = getTomorrowStart();

    const items = await prisma.item.findMany({
      where: {
        isEnabled: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        minimalQuantity: true,
        isCraftable: true,
        canBeSold: true,
        price: true,
        weight: true,
        categoryId: true,
        companyGroupId: true,
        order: true,
        createdAt: true,
        updatedAt: true,
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
        stockHistory: {
          where: {
            ...(chestId ? { chestId: chestId } : {}),
            timestamp: {
              gte: yesterday,
              lt: tomorrow,
            },
            chest: {
              isEnabled: true,
            },
          },
          select: {
            id: true,
            itemId: true,
            chestId: true,
            quantity: true,
            timestamp: true,
          },
          orderBy: {
            timestamp: 'desc',
          },
          take: 100,
        },
      },
    });

    const itemsWithStock = items.map((item) => {
      if (chestId) {
        const stockHistoryToday = item.stockHistory.filter((sh) => {
          const shDateStr = formatDate(new Date(sh.timestamp));
          const todayStr = formatDate(today);
          return shDateStr === todayStr;
        });
        const stockToday = stockHistoryToday.length > 0 
          ? stockHistoryToday.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
          : null;

        const stockHistoryYesterday = item.stockHistory.filter((sh) => {
          const shDateStr = formatDate(new Date(sh.timestamp));
          const yesterdayStr = formatDate(yesterday);
          return shDateStr === yesterdayStr;
        });
        const stockYesterday = stockHistoryYesterday.length > 0
          ? stockHistoryYesterday.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
          : null;

        return {
          ...item,
          stockToday: stockToday?.quantity ?? null,
          stockYesterday: stockYesterday?.quantity ?? null,
          price: item.price ? Number(item.price) : null,
        };
      } else {
        const stockHistoryToday = item.stockHistory.filter((sh) => {
          const shDateStr = formatDate(new Date(sh.timestamp));
          const todayStr = formatDate(today);
          return shDateStr === todayStr;
        });

        const stocksByChestToday = new Map<string, typeof stockHistoryToday[0]>();
        stockHistoryToday.forEach((sh) => {
          const existing = stocksByChestToday.get(sh.chestId);
          if (!existing || new Date(sh.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
            stocksByChestToday.set(sh.chestId, sh);
          }
        });

        const totalStockToday = Array.from(stocksByChestToday.values()).reduce((sum, sh) => sum + sh.quantity, 0);

        const stockHistoryYesterday = item.stockHistory.filter((sh) => {
          const shDateStr = formatDate(new Date(sh.timestamp));
          const yesterdayStr = formatDate(yesterday);
          return shDateStr === yesterdayStr;
        });

        const stocksByChestYesterday = new Map<string, typeof stockHistoryYesterday[0]>();
        stockHistoryYesterday.forEach((sh) => {
          const existing = stocksByChestYesterday.get(sh.chestId);
          if (!existing || new Date(sh.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
            stocksByChestYesterday.set(sh.chestId, sh);
          }
        });

        const totalStockYesterday = Array.from(stocksByChestYesterday.values()).reduce((sum, sh) => sum + sh.quantity, 0);

        return {
          ...item,
          stockToday: stocksByChestToday.size > 0 ? totalStockToday : null,
          stockYesterday: stocksByChestYesterday.size > 0 ? totalStockYesterday : null,
          price: item.price ? Number(item.price) : null,
        };
      }
    });

    return {
      status: 200,
      data: itemsWithStock,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des objets avec stock');
  }
}

/**
 * Updates stock for multiple items
 * If stock already exists today for the specified chest, it is updated
 * Otherwise, a new stock is created for this chest
 * @param data - Array of items with their quantities
 * @param chestId - Chest ID (optional, if null or not provided, uses the "foure tout" chest)
 */
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
export async function addOrderItemsToStock(orderId: string, chestId?: string | null) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const featureBlock = await getAppFeaturesActionBlock(['orders', 'stock']);
    if (featureBlock) return featureBlock;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return {
        status: 404,
        error: 'Commande non trouvée',
      };
    }

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();

    let targetChestId = chestId;
    if (!targetChestId) {
      targetChestId = await getDefaultChestId();
    }

    await prisma.$transaction(async (tx) => {
      for (const orderItem of order.items) {
        const existingStock = await tx.stockHistory.findFirst({
          where: {
            itemId: orderItem.itemId,
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
          await tx.stockHistory.update({
            where: { id: existingStock.id },
            data: {
              quantity: existingStock.quantity + orderItem.quantity,
            },
          });
        } else {
          await tx.stockHistory.create({
            data: {
              itemId: orderItem.itemId,
              chestId: targetChestId,
              quantity: orderItem.quantity,
            },
          });
        }
      }
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de l\'ajout des objets au stock');
  }
}

/**
 * Gets all items with their stocks for a given date
 */
export async function getItemsWithStockForDate(date: Date, chestId?: string | null) {
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

    const dayStart = getStartOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const items = await prisma.item.findMany({
      where: {
        isEnabled: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        minimalQuantity: true,
        isCraftable: true,
        canBeSold: true,
        price: true,
        weight: true,
        categoryId: true,
        companyGroupId: true,
        order: true,
        createdAt: true,
        updatedAt: true,
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
        stockHistory: {
          where: {
            timestamp: {
              gte: dayStart,
              lt: dayEnd,
            },
            ...(chestId ? { chestId: chestId } : {}),
            chest: {
              isEnabled: true,
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });

    const itemsWithStock = items.map((item) => {
      const stockForDate = item.stockHistory.length > 0 
        ? item.stockHistory[0] // Le plus récent du jour pour ce coffre
        : null;

      return {
        ...item,
        stockForDate: stockForDate?.quantity ?? null,
        stockHistoryId: stockForDate?.id ?? null,
        price: item.price ? Number(item.price) : null,
      };
    });

    return {
      status: 200,
      data: itemsWithStock,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des objets avec stock');
  }
}

/**
 * Overwrites stocks for a given date and specific chest
 * Deletes all existing stocks for this date and chest, then creates new stocks
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
export async function getItemsWithDetailedStock(itemIds?: string[]) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const featureBlock = await getAppFeatureActionBlock('search');
    if (featureBlock) return featureBlock;

    const today = getTodayStart();
    const yesterday = getYesterdayStart();

    const items = await prisma.item.findMany({
      where: {
        isEnabled: true,
        ...(itemIds && itemIds.length > 0 ? { id: { in: itemIds } } : {}),
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        minimalQuantity: true,
        isCraftable: true,
        canBeSold: true,
        price: true,
        weight: true,
        categoryId: true,
        companyGroupId: true,
        order: true,
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        companyGroup: {
          select: {
            id: true,
            name: true,
          },
        },
        stockHistory: {
          where: {
            timestamp: {
              gte: yesterday,
            },
            chest: {
              isEnabled: true,
            },
          },
          select: {
            id: true,
            chestId: true,
            quantity: true,
            timestamp: true,
            chest: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });

    const allChests = await prisma.chest.findMany({
      where: {
        isEnabled: true,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
      },
    });

    const itemsWithDetailedStock = items.map((item) => {
      // Group stocks by chest for today
      const stocksByChestToday = new Map<string, { quantity: number; timestamp: Date }>();
      const stocksByChestYesterday = new Map<string, { quantity: number; timestamp: Date }>();

      item.stockHistory.forEach((sh) => {
        const shDateStr = formatDate(new Date(sh.timestamp));
        const todayStr = formatDate(today);
        const yesterdayStr = formatDate(yesterday);

        if (shDateStr === todayStr) {
          const existing = stocksByChestToday.get(sh.chestId);
          if (!existing || new Date(sh.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
            stocksByChestToday.set(sh.chestId, { quantity: sh.quantity, timestamp: sh.timestamp });
          }
        } else if (shDateStr === yesterdayStr) {
          const existing = stocksByChestYesterday.get(sh.chestId);
          if (!existing || new Date(sh.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
            stocksByChestYesterday.set(sh.chestId, { quantity: sh.quantity, timestamp: sh.timestamp });
          }
        }
      });

      // Calculate total stock today and yesterday
      const totalStockToday = Array.from(stocksByChestToday.values()).reduce((sum, sh) => sum + sh.quantity, 0);
      const totalStockYesterday = Array.from(stocksByChestYesterday.values()).reduce((sum, sh) => sum + sh.quantity, 0);

      const stockByChest = allChests.map((chest) => {
        const stockToday = stocksByChestToday.get(chest.id);
        const stockYesterday = stocksByChestYesterday.get(chest.id);

        return {
          chestId: chest.id,
          chestName: chest.name,
          stockToday: stockToday?.quantity ?? null,
          stockYesterday: stockYesterday?.quantity ?? null,
        };
      });

      return {
        ...item,
        price: item.price ? Number(item.price) : null,
        totalStockToday: stocksByChestToday.size > 0 ? totalStockToday : null,
        totalStockYesterday: stocksByChestYesterday.size > 0 ? totalStockYesterday : null,
        stockByChest,
      };
    });

    return {
      status: 200,
      data: itemsWithDetailedStock,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des items avec stocks détaillés');
  }
}

/**
 * Checks if all order items have today's stock
 */
export async function checkOrderItemsStockToday(orderId: string, chestId?: string | null) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const featureBlock = await getAppFeaturesActionBlock(['orders', 'stock']);
    if (featureBlock) return featureBlock;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return {
        status: 404,
        error: 'Commande non trouvée',
      };
    }

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();

    const stockChecks = await Promise.all(
      order.items.map(async (orderItem) => {
        const stockToday = await prisma.stockHistory.findFirst({
          where: {
            itemId: orderItem.itemId,
            ...(chestId ? { chestId } : {}),
            timestamp: {
              gte: today,
              lt: tomorrow,
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
        });

        return {
          itemId: orderItem.itemId,
          itemName: orderItem.item.name,
          hasStockToday: stockToday !== null,
        };
      })
    );

    const allHaveStockToday = stockChecks.every((check) => check.hasStockToday);

    return {
      status: 200,
      data: {
        allHaveStockToday,
        items: stockChecks,
      },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la vérification du stock');
  }
}

/**
 * Vérifie qu'on a assez de stock pour retirer les items d'une commande sortante
 * Retourne true si tous les items ont assez de stock, false sinon
 */
export async function checkOrderItemsStockSufficient(orderId: string, chestId?: string | null) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const featureBlock = await getAppFeaturesActionBlock(['orders', 'stock']);
    if (featureBlock) return featureBlock;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return {
        status: 404,
        error: 'Commande non trouvée',
      };
    }

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();

    const stockChecks = await Promise.all(
      order.items.map(async (orderItem) => {
        const stockToday = await prisma.stockHistory.findFirst({
          where: {
            itemId: orderItem.itemId,
            ...(chestId ? { chestId } : {}),
            timestamp: {
              gte: today,
              lt: tomorrow,
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
        });

        const hasStockToday = stockToday !== null;
        const currentStock = stockToday?.quantity ?? 0;
        const hasEnoughStock = currentStock >= orderItem.quantity;

        return {
          itemId: orderItem.itemId,
          itemName: orderItem.item.name,
          hasStockToday,
          currentStock,
          requiredQuantity: orderItem.quantity,
          hasEnoughStock,
        };
      })
    );

    const allHaveStockToday = stockChecks.every((check) => check.hasStockToday);
    const allHaveEnoughStock = stockChecks.every((check) => check.hasEnoughStock);

    return {
      status: 200,
      data: {
        allHaveStockToday,
        allHaveEnoughStock,
        items: stockChecks,
      },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la vérification du stock');
  }
}

/**
 * Removes items from an outgoing order from today's stock
 * Checks if there is enough stock before removing
 * @param orderId - Order ID
 * @param chestId - Chest ID to remove stocks from (optional, uses "foure tout" by default)
 */
export async function removeOrderItemsFromStock(orderId: string, chestId?: string | null) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const featureBlock = await getAppFeaturesActionBlock(['orders', 'stock']);
    if (featureBlock) return featureBlock;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return {
        status: 404,
        error: 'Commande non trouvée',
      };
    }

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();

    let targetChestId = chestId;
    if (!targetChestId) {
      targetChestId = await getDefaultChestId();
    }

    const stockChecks = await Promise.all(
      order.items.map(async (orderItem) => {
        const stockToday = await prisma.stockHistory.findFirst({
          where: {
            itemId: orderItem.itemId,
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

        return {
          orderItem,
          stockToday,
          hasStockToday: stockToday !== null,
          hasEnoughStock: stockToday ? stockToday.quantity >= orderItem.quantity : false,
        };
      })
    );

    const allHaveStockToday = stockChecks.every((check) => check.hasStockToday);
    if (!allHaveStockToday) {
      const missingItems = stockChecks
        .filter((check) => !check.hasStockToday)
        .map((check) => check.orderItem.item.name);
      return {
        status: 400,
        error: `Le stock d'aujourd'hui n'est pas fait pour les objets suivants : ${missingItems.join(', ')}`,
      };
    }

    const allHaveEnoughStock = stockChecks.every((check) => check.hasEnoughStock);
    if (!allHaveEnoughStock) {
      const insufficientItems = stockChecks
        .filter((check) => !check.hasEnoughStock)
        .map((check) => {
          const currentStock = check.stockToday?.quantity ?? 0;
          return `${check.orderItem.item.name} (stock actuel: ${currentStock}, requis: ${check.orderItem.quantity})`;
        });
      return {
        status: 400,
        error: `Stock insuffisant pour les objets suivants : ${insufficientItems.join(', ')}`,
      };
    }

    // Remove quantities from the specified chest stock
    await prisma.$transaction(async (tx) => {
      for (const check of stockChecks) {
        if (check.stockToday) {
          // Security check: ensure stock belongs to the correct chest
          if (check.stockToday.chestId !== targetChestId) {
            throw new Error(`Le stock trouvé n'appartient pas au coffre attendu pour ${check.orderItem.item.name}`);
          }
          
          const newQuantity = check.stockToday.quantity - check.orderItem.quantity;
          if (newQuantity < 0) {
            throw new Error(`Stock insuffisant pour ${check.orderItem.item.name}`);
          }
          await tx.stockHistory.update({
            where: { id: check.stockToday.id },
            data: {
              quantity: newQuantity,
            },
          });
        }
      }
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du retrait des objets du stock');
  }
}

/**
 * Transfers an item from a source chest to a destination chest
 * Checks that the source chest has enough stock before transferring
 * @param itemId - Item ID to transfer
 * @param quantity - Quantity to transfer
 * @param sourceChestId - Source chest ID
 * @param destinationChestId - Destination chest ID
 */
export async function transferStock(data: {
  itemId: string;
  quantity: number;
  sourceChestId: string;
  destinationChestId: string;
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

    if (data.sourceChestId === data.destinationChestId) {
      return {
        status: 400,
        error: 'Le coffre source et le coffre destination doivent être différents',
      };
    }

    if (data.quantity <= 0) {
      return {
        status: 400,
        error: 'La quantité à transférer doit être positive',
      };
    }

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();

    const sourceStock = await prisma.stockHistory.findFirst({
      where: {
        itemId: data.itemId,
        chestId: data.sourceChestId,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    if (!sourceStock) {
      return {
        status: 400,
        error: 'Aucun stock trouvé dans le coffre source pour cet item aujourd\'hui',
      };
    }

    if (sourceStock.quantity < data.quantity) {
      return {
        status: 400,
        error: `Stock insuffisant dans le coffre source. Stock disponible: ${sourceStock.quantity}, quantité demandée: ${data.quantity}`,
      };
    }

    await prisma.$transaction(async (tx) => {
      const newSourceQuantity = sourceStock.quantity - data.quantity;
      await tx.stockHistory.update({
        where: { id: sourceStock.id },
        data: {
          quantity: newSourceQuantity,
        },
      });

      const destinationStock = await tx.stockHistory.findFirst({
        where: {
          itemId: data.itemId,
          chestId: data.destinationChestId,
          timestamp: {
            gte: today,
            lt: tomorrow,
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        });

        if (destinationStock) {
          await tx.stockHistory.update({
          where: { id: destinationStock.id },
          data: {
            quantity: destinationStock.quantity + data.quantity,
            },
          });
        } else {
          await tx.stockHistory.create({
          data: {
            itemId: data.itemId,
            chestId: data.destinationChestId,
            quantity: data.quantity,
          },
        });
      }
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du transfert des items');
  }
}

/**
 * Transfers multiple items from a source chest to a destination chest
 * Checks that the source chest has enough stock for each item before transferring
 * The operation is transactional: either all transfers succeed, or none are applied
 */
export async function transferMultipleStock(data: {
  sourceChestId: string;
  destinationChestId: string;
  items: { itemId: string; quantity: number }[];
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

    const { sourceChestId, destinationChestId, items } = data;

    if (sourceChestId === destinationChestId) {
      return {
        status: 400,
        error: 'Le coffre source et le coffre destination doivent être différents',
      };
    }

    const validItems = items.filter((i) => i.quantity > 0);
    if (validItems.length === 0) {
      return {
        status: 400,
        error: 'Aucun item à transférer',
      };
    }

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();

    await prisma.$transaction(async (tx) => {
      for (const { itemId, quantity } of validItems) {
        if (quantity <= 0) {
          throw new Error(`La quantité à transférer doit être positive pour l'item ${itemId}`);
        }

        const sourceStock = await tx.stockHistory.findFirst({
          where: {
            itemId,
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

        if (!sourceStock) {
          throw new Error(`Aucun stock trouvé dans le coffre source pour l'item ${itemId} aujourd'hui`);
        }

        if (sourceStock.quantity < quantity) {
          throw new Error(
            `Stock insuffisant dans le coffre source pour l'item ${itemId}. Stock disponible: ${sourceStock.quantity}, quantité demandée: ${quantity}`
          );
        }

        const newSourceQuantity = sourceStock.quantity - quantity;
        await tx.stockHistory.update({
          where: { id: sourceStock.id },
          data: {
            quantity: newSourceQuantity,
          },
        });

        const destinationStock = await tx.stockHistory.findFirst({
          where: {
            itemId,
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

        if (destinationStock) {
          await tx.stockHistory.update({
            where: { id: destinationStock.id },
            data: {
              quantity: destinationStock.quantity + quantity,
            },
          });
        } else {
          await tx.stockHistory.create({
            data: {
              itemId,
              chestId: destinationChestId,
              quantity,
            },
          });
        }
      }
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du transfert des items');
  }
}

/**
 * Vérifie qu'on a assez de stock pour retirer les items d'une commande sortante
 * Retourne true si tous les items ont assez de stock, false sinon
 */
