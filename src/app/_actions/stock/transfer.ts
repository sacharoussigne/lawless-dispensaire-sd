'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { getTodayStart, getTomorrowStart } from '@/lib/date';

export async function transferStock(
  dispensarySlug: string,
  data: {
    itemId: string;
    quantity: number;
    sourceChestId: string;
    destinationChestId: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'stock',
    });
    if (!ctx.ok) return ctx.response;

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

export async function transferMultipleStock(
  dispensarySlug: string,
  data: {
    sourceChestId: string;
    destinationChestId: string;
    items: { itemId: string; quantity: number }[];
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
            `Stock insuffisant dans le coffre source pour l'item ${itemId}. Stock disponible: ${sourceStock.quantity}, quantité demandée: ${quantity}`,
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
