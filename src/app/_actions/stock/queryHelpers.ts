import prisma from '@/lib/prisma';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import { aggregateTodayYesterday, type StockHistoryRow } from '@/lib/stock/aggregateStock';

export const ITEM_STOCK_SELECT = {
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
} as const;

type ItemRow = {
  id: string;
  name: string;
  description: string | null;
  minimalQuantity: number;
  isCraftable: boolean;
  canBeSold: boolean;
  price: unknown;
  weight: number | null;
  categoryId: string;
  companyGroupId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    color: string;
    order: number;
  } | null;
  companyGroup: {
    id: string;
    name: string;
  } | null;
};

export function mapItemWithStockSnapshot(
  item: ItemRow,
  snapshot: { stockToday: number | null; stockYesterday: number | null } | undefined,
) {
  return {
    ...item,
    stockToday: snapshot?.stockToday ?? null,
    stockYesterday: snapshot?.stockYesterday ?? null,
    price: item.price ? Number(item.price) : null,
  };
}

export async function fetchEnabledItems(dispensaryId: string, orderBy: 'createdAt' | 'name' = 'createdAt') {
  return prisma.item.findMany({
    where: {
      isEnabled: true,
      ...tenantWhere(dispensaryId),
    },
    orderBy: orderBy === 'name' ? { name: 'asc' } : { createdAt: 'desc' },
    select: ITEM_STOCK_SELECT,
  });
}

export async function fetchStockHistoryRows(
  dispensaryId: string,
  itemIds: string[],
  range: { gte: Date; lt: Date },
  chestId?: string | null,
): Promise<StockHistoryRow[]> {
  if (itemIds.length === 0) return [];

  const rows = await prisma.stockHistory.findMany({
    where: {
      itemId: { in: itemIds },
      ...(chestId ? { chestId } : {}),
      timestamp: range,
      chest: {
        isEnabled: true,
        ...tenantWhere(dispensaryId),
      },
    },
    select: {
      itemId: true,
      chestId: true,
      quantity: true,
      timestamp: true,
    },
    orderBy: { timestamp: 'desc' },
  });

  return rows;
}

export function buildStockSnapshots(
  stockRows: StockHistoryRow[],
  today: Date,
  yesterday: Date,
  chestId?: string | null,
) {
  return aggregateTodayYesterday(stockRows, today, yesterday, chestId);
}
