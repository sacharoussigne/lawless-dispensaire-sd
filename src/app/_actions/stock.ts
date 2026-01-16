'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import {
  getTodayStart,
  getYesterdayStart,
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
      include: {
        category: true,
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

