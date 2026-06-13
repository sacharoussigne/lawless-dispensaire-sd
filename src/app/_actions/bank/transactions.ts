'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

import { parseISO } from 'date-fns';
import {
  createTransactionSchema,
  updateTransactionSchema,
  deleteTransactionSchema,
} from '@/app/_actions/bank/schemas';
import { checkAccountAccess, recalculateWeekBalance } from '@/app/_actions/bank/internals';

export async function createTransaction(
  dispensarySlug: string,
  data: {
    weekId: string;
    date: string | Date;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
    name: string;
    description?: string;
    amount: number;
    order?: number;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'bank',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;
    const { session } = ctx;

    const validatedData = createTransactionSchema.parse(data);

    const week = await prisma.bankAccountWeek.findFirst({
      where: {
        id: validatedData.weekId,
        account: tenantWhere(dispensaryId),
      },
      include: {
        account: true,
      },
    });

    if (!week) {
      return {
        status: 404,
        error: 'Semaine introuvable',
      };
    }

    const accessCheck = await checkAccountAccess(
      dispensaryId,
      week.accountId,
      session.user.id,
      true,
    );
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès en écriture requis',
      };
    }

    const date = typeof validatedData.date === 'string' ? parseISO(validatedData.date) : validatedData.date;

    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const allTransactions = await prisma.bankTransaction.findMany({
      where: {
        weekId: validatedData.weekId,
      },
      select: {
        id: true,
        date: true,
        order: true,
      },
    });

    const sameDateTransactions = allTransactions.filter((t) => {
      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);
      return tDate.getTime() === normalizedDate.getTime();
    });

    let newOrder: number;
    if (validatedData.order !== undefined) {
      newOrder = validatedData.order;

      const transactionsToShift = sameDateTransactions.filter((t) => t.order >= newOrder);
      if (transactionsToShift.length > 0) {
        await prisma.bankTransaction.updateMany({
          where: {
            id: {
              in: transactionsToShift.map((t) => t.id),
            },
          },
          data: {
            order: {
              increment: 1,
            },
          },
        });
      }
    } else {
      const maxOrder = sameDateTransactions.length > 0
        ? Math.max(...sameDateTransactions.map((t) => t.order))
        : -1;
      newOrder = maxOrder + 1;
    }

    const transaction = await prisma.bankTransaction.create({
      data: {
        weekId: validatedData.weekId,
        date,
        type: validatedData.type,
        name: validatedData.name,
        description: validatedData.description,
        amount: validatedData.amount,
        order: newOrder,
      },
    });

    await recalculateWeekBalance(dispensaryId, validatedData.weekId);

    return {
      status: 201,
      data: transaction,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de la transaction');
  }
}

export async function updateTransaction(
  dispensarySlug: string,
  data: {
    id: string;
    date?: string | Date;
    type?: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
    name?: string;
    description?: string;
    amount?: number;
    order?: number;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'bank',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;
    const { session } = ctx;

    const validatedData = updateTransactionSchema.parse(data);

    const transaction = await prisma.bankTransaction.findFirst({
      where: {
        id: validatedData.id,
        week: {
          account: tenantWhere(dispensaryId),
        },
      },
      include: {
        week: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!transaction) {
      return {
        status: 404,
        error: 'Transaction introuvable',
      };
    }

    const accessCheck = await checkAccountAccess(
      dispensaryId,
      transaction.week.accountId,
      session.user.id,
      true,
    );
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès en écriture requis',
      };
    }

    const updateData: Record<string, unknown> = {};
    let newDate: Date | undefined;
    const oldDate = new Date(transaction.date);
    oldDate.setHours(0, 0, 0, 0);

    const allTransactions = await prisma.bankTransaction.findMany({
      where: {
        weekId: transaction.weekId,
        id: {
          not: validatedData.id,
        },
      },
      select: {
        id: true,
        date: true,
        order: true,
      },
    });

    if (validatedData.date !== undefined) {
      newDate = typeof validatedData.date === 'string' ? parseISO(validatedData.date) : validatedData.date;
      updateData.date = newDate;

      const normalizedNewDate = new Date(newDate);
      normalizedNewDate.setHours(0, 0, 0, 0);

      if (oldDate.getTime() !== normalizedNewDate.getTime()) {
        const oldDateTransactions = allTransactions.filter((t) => {
          const tDate = new Date(t.date);
          tDate.setHours(0, 0, 0, 0);
          return tDate.getTime() === oldDate.getTime();
        });

        const oldOrder = transaction.order;
        const transactionsToShiftDown = oldDateTransactions.filter((t) => t.order > oldOrder);
        if (transactionsToShiftDown.length > 0) {
          await prisma.bankTransaction.updateMany({
            where: {
              id: {
                in: transactionsToShiftDown.map((t) => t.id),
              },
            },
            data: {
              order: {
                decrement: 1,
              },
            },
          });
        }

        const sameDateTransactions = allTransactions.filter((t) => {
          const tDate = new Date(t.date);
          tDate.setHours(0, 0, 0, 0);
          return tDate.getTime() === normalizedNewDate.getTime();
        });

        if (validatedData.order !== undefined) {
          const newOrder = validatedData.order;
          updateData.order = newOrder;

          const transactionsToShift = sameDateTransactions.filter((t) => t.order >= newOrder);
          if (transactionsToShift.length > 0) {
            await prisma.bankTransaction.updateMany({
              where: {
                id: {
                  in: transactionsToShift.map((t) => t.id),
                },
              },
              data: {
                order: {
                  increment: 1,
                },
              },
            });
          }
        } else {
          const maxOrder = sameDateTransactions.length > 0
            ? Math.max(...sameDateTransactions.map((t) => t.order))
            : -1;
          updateData.order = maxOrder + 1;
        }
      }
    }

    if (validatedData.order !== undefined && !updateData.order) {
      const normalizedCurrentDate = new Date(transaction.date);
      normalizedCurrentDate.setHours(0, 0, 0, 0);

      const sameDateTransactions = allTransactions.filter((t) => {
        const tDate = new Date(t.date);
        tDate.setHours(0, 0, 0, 0);
        return tDate.getTime() === normalizedCurrentDate.getTime();
      });

      const oldOrder = transaction.order;
      const newOrder = validatedData.order;

      if (oldOrder !== newOrder) {
        updateData.order = newOrder;

        if (newOrder < oldOrder) {
          const transactionsToShift = sameDateTransactions.filter((t) =>
            t.order >= newOrder && t.order < oldOrder,
          );
          if (transactionsToShift.length > 0) {
            await prisma.bankTransaction.updateMany({
              where: {
                id: {
                  in: transactionsToShift.map((t) => t.id),
                },
              },
              data: {
                order: {
                  increment: 1,
                },
              },
            });
          }
        } else {
          const transactionsToShift = sameDateTransactions.filter((t) =>
            t.order > oldOrder && t.order <= newOrder,
          );
          if (transactionsToShift.length > 0) {
            await prisma.bankTransaction.updateMany({
              where: {
                id: {
                  in: transactionsToShift.map((t) => t.id),
                },
              },
              data: {
                order: {
                  decrement: 1,
                },
              },
            });
          }
        }
      }
    }

    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount;

    const updatedTransaction = await prisma.bankTransaction.update({
      where: { id: validatedData.id },
      data: updateData,
    });

    await recalculateWeekBalance(dispensaryId, transaction.weekId);

    return {
      status: 200,
      data: updatedTransaction,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification de la transaction');
  }
}

export async function deleteTransaction(
  dispensarySlug: string,
  data: { id: string },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'bank',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;
    const { session } = ctx;

    const validatedData = deleteTransactionSchema.parse(data);

    const transaction = await prisma.bankTransaction.findFirst({
      where: {
        id: validatedData.id,
        week: {
          account: tenantWhere(dispensaryId),
        },
      },
      include: {
        week: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!transaction) {
      return {
        status: 404,
        error: 'Transaction introuvable',
      };
    }

    const accessCheck = await checkAccountAccess(
      dispensaryId,
      transaction.week.accountId,
      session.user.id,
      true,
    );
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès en écriture requis',
      };
    }

    const transactionDate = new Date(transaction.date);
    transactionDate.setHours(0, 0, 0, 0);
    const transactionOrder = transaction.order;

    const allTransactions = await prisma.bankTransaction.findMany({
      where: {
        weekId: transaction.weekId,
        id: {
          not: validatedData.id,
        },
      },
      select: {
        id: true,
        date: true,
        order: true,
      },
    });

    const sameDateTransactions = allTransactions.filter((t) => {
      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);
      return tDate.getTime() === transactionDate.getTime() && t.order > transactionOrder;
    });

    if (sameDateTransactions.length > 0) {
      await prisma.bankTransaction.updateMany({
        where: {
          id: {
            in: sameDateTransactions.map((t) => t.id),
          },
        },
        data: {
          order: {
            decrement: 1,
          },
        },
      });
    }

    await prisma.bankTransaction.delete({
      where: { id: validatedData.id },
    });

    await recalculateWeekBalance(dispensaryId, transaction.weekId);

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la transaction');
  }
}
