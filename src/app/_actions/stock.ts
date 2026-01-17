'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import {
  getTodayStart,
  getYesterdayStart,
  getTomorrowStart,
  formatDate,
} from '@/lib/date';

/**
 * Récupère tous les items avec leurs stocks d'aujourd'hui et d'hier
 */
export async function getItemsWithStock() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const today = getTodayStart();
    const yesterday = getYesterdayStart();

    const items = await prisma.item.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        idealQuantity: true,
        isCraftable: true,
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
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });

    // Pour chaque item, trouver le stock d'aujourd'hui et d'hier
    const itemsWithStock = items.map((item) => {
      // Stock aujourd'hui : dernier enregistrement d'aujourd'hui
      const stockHistoryToday = item.stockHistory.filter((sh) => {
        const shDateStr = formatDate(new Date(sh.timestamp));
        const todayStr = formatDate(today);
        return shDateStr === todayStr;
      });
      const stockToday = stockHistoryToday.length > 0 
        ? stockHistoryToday.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
        : null;

      // Stock J-1 : dernier enregistrement d'hier
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
      };
    });

    return {
      status: 200,
      data: itemsWithStock,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des items avec stock');
  }
}

/**
 * Met à jour le stock pour plusieurs items
 * Si un stock existe déjà aujourd'hui, il est mis à jour
 * Sinon, un nouveau stock est créé
 */
export async function updateStock(data: { itemId: string; quantity: number }[]) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();

    // Pour chaque item, créer ou mettre à jour le stock
    const results = await Promise.all(
      data.map(async ({ itemId, quantity }) => {
        // Vérifier si un stock existe déjà aujourd'hui
        const existingStock = await prisma.stockHistory.findFirst({
          where: {
            itemId,
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
          // Mettre à jour le stock existant
          return prisma.stockHistory.update({
            where: {
              id: existingStock.id,
            },
            data: {
              quantity,
            },
          });
        } else {
          // Créer un nouveau stock
          return prisma.stockHistory.create({
            data: {
              itemId,
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
 * Effectue un craft : ajoute l'item crafté au stock et enlève les ingrédients
 */
export async function craftItem(data: {
  craftedItemId: string;
  recipeId: string;
  times: number; // Nombre de fois qu'on craft la recette
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    // Récupérer la recette avec ses ingrédients
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

    // Calculer la quantité totale produite
    const totalQuantityProduced = recipe.quantity * data.times;

    // Vérifier que tous les ingrédients ont assez de stock
    const ingredientChecks = await Promise.all(
      recipe.ingredients.map(async (ingredient) => {
        const requiredQuantity = ingredient.quantity * data.times;
        
        // Récupérer le stock d'aujourd'hui
        const stockToday = await prisma.stockHistory.findFirst({
          where: {
            itemId: ingredient.usedItemId,
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
            available: availableStock,
            required: requiredQuantity,
            hasEnough: false,
          };
        }

        return {
          itemId: ingredient.usedItemId,
          available: availableStock,
          required: requiredQuantity,
          hasEnough: true,
        };
      })
    );

    // Vérifier si tous les ingrédients ont assez de stock
    const allHaveEnough = ingredientChecks.every((check) => check.hasEnough);
    if (!allHaveEnough) {
      return {
        status: 400,
        error: 'Stock insuffisant pour certains ingrédients',
        data: ingredientChecks,
      };
    }

    // Effectuer le craft dans une transaction
    await prisma.$transaction(async (tx) => {
      // 1. Ajouter l'item crafté au stock
      const existingCraftedStock = await tx.stockHistory.findFirst({
        where: {
          itemId: data.craftedItemId,
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
        // Mettre à jour le stock existant
        await tx.stockHistory.update({
          where: { id: existingCraftedStock.id },
          data: {
            quantity: existingCraftedStock.quantity + totalQuantityProduced,
          },
        });
      } else {
        // Créer un nouveau stock
        await tx.stockHistory.create({
          data: {
            itemId: data.craftedItemId,
            quantity: totalQuantityProduced,
          },
        });
      }

      // 2. Enlever les ingrédients du stock
      for (const ingredient of recipe.ingredients) {
        const requiredQuantity = ingredient.quantity * data.times;
        
        const existingIngredientStock = await tx.stockHistory.findFirst({
          where: {
            itemId: ingredient.usedItemId,
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
          // Si pas de stock, créer un stock négatif (ne devrait pas arriver normalement)
          await tx.stockHistory.create({
            data: {
              itemId: ingredient.usedItemId,
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
 * Ajoute les items d'une commande au stock d'aujourd'hui
 * Additionne les quantités aux stocks existants
 */
export async function addOrderItemsToStock(orderId: string) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    // Récupérer la commande avec ses items
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

    // Pour chaque item de la commande, ajouter la quantité au stock
    await prisma.$transaction(async (tx) => {
      for (const orderItem of order.items) {
        // Récupérer le stock d'aujourd'hui
        const existingStock = await tx.stockHistory.findFirst({
          where: {
            itemId: orderItem.itemId,
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
          // Additionner la quantité au stock existant
          await tx.stockHistory.update({
            where: { id: existingStock.id },
            data: {
              quantity: existingStock.quantity + orderItem.quantity,
            },
          });
        } else {
          // Créer un nouveau stock avec la quantité de la commande
          await tx.stockHistory.create({
            data: {
              itemId: orderItem.itemId,
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
    return actionErrorParser(error, 'Erreur lors de l\'ajout des items au stock');
  }
}

/**
 * Vérifie si tous les items d'une commande ont un stock d'aujourd'hui
 */
export async function checkOrderItemsStockToday(orderId: string) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    // Récupérer la commande avec ses items
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

    // Vérifier le stock d'aujourd'hui pour chaque item
    const stockChecks = await Promise.all(
      order.items.map(async (orderItem) => {
        const stockToday = await prisma.stockHistory.findFirst({
          where: {
            itemId: orderItem.itemId,
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

