'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import {
  getTodayStart,
  getYesterdayStart,
  getTomorrowStart,
  formatDate,
  getStartOfDay,
} from '@/lib/date';

/**
 * Récupère le coffre par défaut "Foure tout"
 */
async function getDefaultChestId(): Promise<string> {
  const defaultChest = await prisma.chest.findFirst({
    where: {
      name: 'Foure tout',
    },
  });
  if (!defaultChest) {
    throw new Error('Coffre par défaut "Foure tout" non trouvé');
  }
  return defaultChest.id;
}

/**
 * Récupère tous les items avec leurs stocks d'aujourd'hui et d'hier
 * @param chestId - ID du coffre à filtrer (optionnel, null pour tous les coffres)
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

    const today = getTodayStart();
    const yesterday = getYesterdayStart();

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
        idealQuantity: true,
        isCraftable: true,
        canBeSold: true,
        price: true,
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
          where: chestId
            ? {
                chestId: chestId,
              }
            : undefined,
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
        },
      },
    });

    // Pour chaque item, trouver le stock d'aujourd'hui et d'hier
    const itemsWithStock = items.map((item) => {
      if (chestId) {
        // Si un coffre spécifique est sélectionné, prendre le dernier enregistrement de ce coffre
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
        // Si "Tous les coffres" est sélectionné, faire la SOMME de tous les coffres
        // Pour chaque coffre, prendre le dernier enregistrement d'aujourd'hui, puis sommer
        const stockHistoryToday = item.stockHistory.filter((sh) => {
          const shDateStr = formatDate(new Date(sh.timestamp));
          const todayStr = formatDate(today);
          return shDateStr === todayStr;
        });

        // Grouper par coffre et prendre le dernier enregistrement de chaque coffre
        const stocksByChestToday = new Map<string, typeof stockHistoryToday[0]>();
        stockHistoryToday.forEach((sh) => {
          const existing = stocksByChestToday.get(sh.chestId);
          if (!existing || new Date(sh.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
            stocksByChestToday.set(sh.chestId, sh);
          }
        });

        // Faire la somme de tous les coffres
        const totalStockToday = Array.from(stocksByChestToday.values()).reduce((sum, sh) => sum + sh.quantity, 0);

        // Même chose pour hier
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
 * Met à jour le stock pour plusieurs items
 * Si un stock existe déjà aujourd'hui pour le coffre spécifié, il est mis à jour
 * Sinon, un nouveau stock est créé pour ce coffre
 * @param data - Tableau d'items avec leurs quantités
 * @param chestId - ID du coffre (optionnel, si null ou non fourni, utilise le coffre "foure tout")
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

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();

    // Si aucun chestId n'est fourni, utiliser le coffre "foure tout" par défaut
    let targetChestId = chestId;
    if (!targetChestId) {
      const defaultChest = await prisma.chest.findFirst({
        where: {
          name: 'Foure tout',
        },
      });
      if (!defaultChest) {
        return {
          status: 404,
          error: 'Coffre par défaut "Foure tout" non trouvé',
        };
      }
      targetChestId = defaultChest.id;
    }

    // Pour chaque item, créer ou mettre à jour le stock UNIQUEMENT pour le coffre spécifié
    const results = await Promise.all(
      data.map(async ({ itemId, quantity }) => {
        // Vérifier si un stock existe déjà aujourd'hui pour ce coffre spécifique
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
          // Mettre à jour le stock existant de ce coffre uniquement
          return prisma.stockHistory.update({
            where: {
              id: existingStock.id,
            },
            data: {
              quantity,
            },
          });
        } else {
          // Créer un nouveau stock pour ce coffre spécifique
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
 * Effectue un craft : ajoute l'item crafté au stock et enlève les ingrédients
 */
export async function craftItem(data: {
  craftedItemId: string;
  recipeId: string;
  times: number; // Nombre de fois qu'on craft la recette
  chestId?: string | null; // ID du coffre où effectuer le craft (optionnel, utilise "foure tout" par défaut)
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    // Déterminer le coffre à utiliser
    const targetChestId = data.chestId || await getDefaultChestId();

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

    // Vérifier que tous les ingrédients ont assez de stock dans le coffre sélectionné
    const ingredientChecks = await Promise.all(
      recipe.ingredients.map(async (ingredient) => {
        const requiredQuantity = ingredient.quantity * data.times;
        
        // Récupérer le stock d'aujourd'hui pour le coffre sélectionné
        const stockToday = await prisma.stockHistory.findFirst({
          where: {
            itemId: ingredient.usedItemId,
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
      // 1. Ajouter l'item crafté au stock du coffre sélectionné
      const existingCraftedStock = await tx.stockHistory.findFirst({
        where: {
          itemId: data.craftedItemId,
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

      if (existingCraftedStock) {
        // Mettre à jour le stock existant
        await tx.stockHistory.update({
          where: { id: existingCraftedStock.id },
          data: {
            quantity: existingCraftedStock.quantity + totalQuantityProduced,
          },
        });
      } else {
        // Créer un nouveau stock dans le coffre sélectionné
        await tx.stockHistory.create({
          data: {
            itemId: data.craftedItemId,
            chestId: targetChestId,
            quantity: totalQuantityProduced,
          },
        });
      }

      // 2. Enlever les ingrédients du stock du coffre sélectionné
      for (const ingredient of recipe.ingredients) {
        const requiredQuantity = ingredient.quantity * data.times;
        
        const existingIngredientStock = await tx.stockHistory.findFirst({
          where: {
            itemId: ingredient.usedItemId,
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
              chestId: targetChestId,
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
 * @param orderId - ID de la commande
 * @param chestId - ID du coffre où ajouter les stocks (optionnel, utilise "foure tout" par défaut)
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

    // Si aucun chestId n'est fourni, utiliser le coffre "foure tout" par défaut
    let targetChestId = chestId;
    if (!targetChestId) {
      targetChestId = await getDefaultChestId();
    }

    // Pour chaque item de la commande, ajouter la quantité au stock du coffre spécifié
    await prisma.$transaction(async (tx) => {
      for (const orderItem of order.items) {
        // Récupérer le stock d'aujourd'hui pour ce coffre spécifique
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
          // Additionner la quantité au stock existant de ce coffre
          await tx.stockHistory.update({
            where: { id: existingStock.id },
            data: {
              quantity: existingStock.quantity + orderItem.quantity,
            },
          });
        } else {
          // Créer un nouveau stock avec la quantité de la commande pour ce coffre
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
 * Récupère tous les items avec leurs stocks pour une date donnée
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
        idealQuantity: true,
        isCraftable: true,
        canBeSold: true,
        price: true,
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
          },
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });

    // Pour chaque item, trouver le dernier stock du jour sélectionné pour le coffre spécifié
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
 * Écrase les stocks pour une date donnée et un coffre spécifique
 * Supprime tous les stocks existants pour cette date et ce coffre, puis crée de nouveaux stocks
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

    const dayStart = getStartOfDay(data.date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Déterminer le coffre à utiliser
    const targetChestId = data.chestId || await getDefaultChestId();

    // Supprimer tous les stocks existants pour cette date et ce coffre uniquement
    await prisma.stockHistory.deleteMany({
      where: {
        timestamp: {
          gte: dayStart,
          lt: dayEnd,
        },
        chestId: targetChestId,
      },
    });

    // Créer les nouveaux stocks dans le coffre spécifié
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
 * Récupère les items avec leurs stocks détaillés par coffre
 * Utile pour la recherche d'items avec informations complètes
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
        idealQuantity: true,
        isCraftable: true,
        canBeSold: true,
        price: true,
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

    // Récupérer tous les coffres pour avoir la liste complète
    const allChests = await prisma.chest.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
      },
    });

    const itemsWithDetailedStock = items.map((item) => {
      // Grouper les stocks par coffre pour aujourd'hui
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

      // Calculer le stock total aujourd'hui et hier
      const totalStockToday = Array.from(stocksByChestToday.values()).reduce((sum, sh) => sum + sh.quantity, 0);
      const totalStockYesterday = Array.from(stocksByChestYesterday.values()).reduce((sum, sh) => sum + sh.quantity, 0);

      // Créer un objet avec le stock par coffre (aujourd'hui et hier)
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
 * Vérifie si tous les items d'une commande ont un stock d'aujourd'hui
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

    // Vérifier le stock d'aujourd'hui pour chaque item et si on a assez
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
 * Retire les items d'une commande sortante du stock d'aujourd'hui
 * Vérifie qu'on a assez de stock avant de retirer
 * @param orderId - ID de la commande
 * @param chestId - ID du coffre d'où retirer les stocks (optionnel, utilise "foure tout" par défaut)
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

    // Si aucun chestId n'est fourni, utiliser le coffre "foure tout" par défaut
    let targetChestId = chestId;
    if (!targetChestId) {
      targetChestId = await getDefaultChestId();
    }

    // Vérifier qu'on a assez de stock pour tous les items dans le coffre spécifié
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

    // Vérifier que tous les items ont un stock d'aujourd'hui
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

    // Vérifier qu'on a assez de stock pour tous les items
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

    // Retirer les quantités du stock du coffre spécifié
    await prisma.$transaction(async (tx) => {
      for (const check of stockChecks) {
        if (check.stockToday) {
          // Vérification de sécurité : s'assurer que le stock appartient au bon coffre
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
 * Transfère un item d'un coffre source vers un coffre destination
 * Vérifie que le coffre source a assez de stock avant de transférer
 * @param itemId - ID de l'item à transférer
 * @param quantity - Quantité à transférer
 * @param sourceChestId - ID du coffre source
 * @param destinationChestId - ID du coffre destination
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

    // Vérifier que les coffres sont différents
    if (data.sourceChestId === data.destinationChestId) {
      return {
        status: 400,
        error: 'Le coffre source et le coffre destination doivent être différents',
      };
    }

    // Vérifier que la quantité est positive
    if (data.quantity <= 0) {
      return {
        status: 400,
        error: 'La quantité à transférer doit être positive',
      };
    }

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();

    // Vérifier que le coffre source a assez de stock
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

    // Effectuer le transfert dans une transaction
    await prisma.$transaction(async (tx) => {
      // 1. Retirer la quantité du coffre source
      const newSourceQuantity = sourceStock.quantity - data.quantity;
      await tx.stockHistory.update({
        where: { id: sourceStock.id },
        data: {
          quantity: newSourceQuantity,
        },
      });

      // 2. Ajouter la quantité au coffre destination
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
        // Mettre à jour le stock existant du coffre destination
        await tx.stockHistory.update({
          where: { id: destinationStock.id },
          data: {
            quantity: destinationStock.quantity + data.quantity,
          },
        });
      } else {
        // Créer un nouveau stock pour le coffre destination
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
 * Transfère plusieurs items d'un coffre source vers un coffre destination
 * Vérifie que le coffre source a assez de stock pour chaque item avant de transférer
 * L'opération est transactionnelle : soit tous les transferts réussissent, soit aucun n'est appliqué
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

    const { sourceChestId, destinationChestId, items } = data;

    // Vérifier que les coffres sont différents
    if (sourceChestId === destinationChestId) {
      return {
        status: 400,
        error: 'Le coffre source et le coffre destination doivent être différents',
      };
    }

    // Vérifier qu'il y a au moins un item à transférer
    const validItems = items.filter((i) => i.quantity > 0);
    if (validItems.length === 0) {
      return {
        status: 400,
        error: 'Aucun item à transférer',
      };
    }

    const today = getTodayStart();
    const tomorrow = getTomorrowStart();

    // Effectuer tous les transferts dans une seule transaction
    await prisma.$transaction(async (tx) => {
      for (const { itemId, quantity } of validItems) {
        if (quantity <= 0) {
          throw new Error(`La quantité à transférer doit être positive pour l'item ${itemId}`);
        }

        // 1. Vérifier le stock dans le coffre source
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

        // 2. Retirer la quantité du coffre source
        const newSourceQuantity = sourceStock.quantity - quantity;
        await tx.stockHistory.update({
          where: { id: sourceStock.id },
          data: {
            quantity: newSourceQuantity,
          },
        });

        // 3. Ajouter la quantité au coffre destination
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
