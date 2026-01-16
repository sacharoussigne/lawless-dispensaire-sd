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

