'use server';

import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { getTodayStart, getTomorrowStart } from '@/lib/date';

type TransferItem = { itemId: string; quantity: number };

async function transferItemsInTransaction(
  tx: Prisma.TransactionClient,
  validItems: TransferItem[],
  sourceChestId: string,
  destinationChestId: string,
  today: Date,
  tomorrow: Date,
) {
  const itemIds = validItems.map((i) => i.itemId);

  const sourceStocks = await tx.stockHistory.findMany({
    where: {
      itemId: { in: itemIds },
      chestId: sourceChestId,
      timestamp: { gte: today, lt: tomorrow },
    },
    orderBy: { timestamp: 'desc' },
  });

  const destStocks = await tx.stockHistory.findMany({
    where: {
      itemId: { in: itemIds },
      chestId: destinationChestId,
      timestamp: { gte: today, lt: tomorrow },
    },
    orderBy: { timestamp: 'desc' },
  });

  const latestSourceByItem = new Map<string, (typeof sourceStocks)[0]>();
  for (const row of sourceStocks) {
    if (!latestSourceByItem.has(row.itemId)) {
      latestSourceByItem.set(row.itemId, row);
    }
  }

  const latestDestByItem = new Map<string, (typeof destStocks)[0]>();
  for (const row of destStocks) {
    if (!latestDestByItem.has(row.itemId)) {
      latestDestByItem.set(row.itemId, row);
    }
  }

  for (const { itemId, quantity } of validItems) {
    if (quantity <= 0) {
      throw new Error(`La quantité à transférer doit être positive pour l'item ${itemId}`);
    }

    const sourceStock = latestSourceByItem.get(itemId);
    if (!sourceStock) {
      throw new Error(`Aucun stock trouvé dans le coffre source pour l'item ${itemId} aujourd'hui`);
    }

    if (sourceStock.quantity < quantity) {
      throw new Error(
        `Stock insuffisant dans le coffre source pour l'item ${itemId}. Stock disponible: ${sourceStock.quantity}, quantité demandée: ${quantity}`,
      );
    }

    await tx.stockHistory.update({
      where: { id: sourceStock.id },
      data: { quantity: sourceStock.quantity - quantity },
    });

    const destinationStock = latestDestByItem.get(itemId);
    if (destinationStock) {
      await tx.stockHistory.update({
        where: { id: destinationStock.id },
        data: { quantity: destinationStock.quantity + quantity },
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
}

export async function transferMultipleStock(
  dispensarySlug: string,
  data: {
    sourceChestId: string;
    destinationChestId: string;
    items: TransferItem[];
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'stock',
    });
    if (!ctx.ok) return ctx.response;

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
      await transferItemsInTransaction(
        tx,
        validItems,
        sourceChestId,
        destinationChestId,
        today,
        tomorrow,
      );
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du transfert des items');
  }
}
