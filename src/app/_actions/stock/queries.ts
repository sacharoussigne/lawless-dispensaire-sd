'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import {
  getTodayStart,
  getYesterdayStart,
  getTomorrowStart,
  formatDate,
  getStartOfDay,
} from '@/lib/date';

export async function getItemsWithStock(
  dispensarySlug: string,
  chestId?: string | null,
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'stock',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const today = getTodayStart();
    const yesterday = getYesterdayStart();
    const tomorrow = getTomorrowStart();

    const items = await prisma.item.findMany({
      where: {
        isEnabled: true,
        ...tenantWhere(dispensaryId),
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
              ...tenantWhere(dispensaryId),
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
      }

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
    });

    return {
      status: 200,
      data: itemsWithStock,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des objets avec stock');
  }
}

export async function getItemsWithStockForDate(
  dispensarySlug: string,
  date: Date,
  chestId?: string | null,
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'stock',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const dayStart = getStartOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const items = await prisma.item.findMany({
      where: {
        isEnabled: true,
        ...tenantWhere(dispensaryId),
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
              ...tenantWhere(dispensaryId),
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
        ? item.stockHistory[0]
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

export async function getItemsWithDetailedStock(
  dispensarySlug: string,
  itemIds?: string[],
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'search',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const today = getTodayStart();
    const yesterday = getYesterdayStart();

    const items = await prisma.item.findMany({
      where: {
        isEnabled: true,
        ...tenantWhere(dispensaryId),
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
              ...tenantWhere(dispensaryId),
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
        ...tenantWhere(dispensaryId),
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
