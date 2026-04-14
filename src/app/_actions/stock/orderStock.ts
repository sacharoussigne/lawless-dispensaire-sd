'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { getAppFeaturesActionBlock } from '@/lib/appSettings';
import { getTodayStart, getTomorrowStart } from '@/lib/date';
import { getDefaultChestId } from '@/app/_actions/stock/internals';

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

