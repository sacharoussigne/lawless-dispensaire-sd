'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { getAppFeatureActionBlock } from '@/lib/appSettings';

import { parseISO } from 'date-fns';
import {
  createTransactionSchema,
  updateTransactionSchema,
  deleteTransactionSchema,
} from '@/app/_actions/bank/schemas';
import { checkAccountAccess, recalculateWeekBalance } from '@/app/_actions/bank/internals';

export async function createTransaction(data: {
  weekId: string;
  date: string | Date;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  name: string;
  description?: string;
  amount: number;
  order?: number;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

    const validatedData = createTransactionSchema.parse(data);

    // Check access via the week
    const week = await prisma.bankAccountWeek.findUnique({
      where: { id: validatedData.weekId },
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

    const accessCheck = await checkAccountAccess(week.accountId, session.user.id, true);
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès en écriture requis',
      };
    }

    const date = typeof validatedData.date === 'string' ? parseISO(validatedData.date) : validatedData.date;

    // Normalize date to compare only the date (without time)
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Get all week transactions to calculate order
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

    // Find all transactions with the same date
    const sameDateTransactions = allTransactions.filter((t) => {
      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);
      return tDate.getTime() === normalizedDate.getTime();
    });

    // Déterminer l'ordre à utiliser
    let newOrder: number;
    if (validatedData.order !== undefined) {
      // Si un ordre est explicitement fourni, l'utiliser
      newOrder = validatedData.order;
      
      // Décaler toutes les transactions de la même date avec un ordre >= newOrder
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
      // Calculer l'ordre automatiquement : dernier ordre de cette date + 1, ou 0 si aucune transaction à cette date
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

    // Recalculer le solde de la semaine
    await recalculateWeekBalance(validatedData.weekId);

    return {
      status: 201,
      data: transaction,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de la transaction');
  }
}

/**
 * Updates a transaction
 */
export async function updateTransaction(data: {
  id: string;
  date?: string | Date;
  type?: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  name?: string;
  description?: string;
  amount?: number;
  order?: number;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

    const validatedData = updateTransactionSchema.parse(data);

    const transaction = await prisma.bankTransaction.findUnique({
      where: { id: validatedData.id },
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

    const accessCheck = await checkAccountAccess(transaction.week.accountId, session.user.id, true);
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès en écriture requis',
      };
    }

    const updateData: any = {};
    let newDate: Date | undefined;
    const oldDate = new Date(transaction.date);
    oldDate.setHours(0, 0, 0, 0);
    
    // Récupérer toutes les transactions de la semaine (sauf celle en cours de modification)
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
        // La date a changé, libérer l'ordre de l'ancienne date
        const oldDateTransactions = allTransactions.filter((t) => {
          const tDate = new Date(t.date);
          tDate.setHours(0, 0, 0, 0);
          return tDate.getTime() === oldDate.getTime();
        });
        
        // Décaler les transactions de l'ancienne date avec un ordre > oldOrder vers le bas
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
        
        // Recalculer l'ordre en fonction de la nouvelle date
        // Trouver toutes les transactions de la nouvelle date
        const sameDateTransactions = allTransactions.filter((t) => {
          const tDate = new Date(t.date);
          tDate.setHours(0, 0, 0, 0);
          return tDate.getTime() === normalizedNewDate.getTime();
        });
        
        // Si un ordre est explicitement fourni, l'utiliser, sinon calculer automatiquement
        if (validatedData.order !== undefined) {
          updateData.order = validatedData.order;
          
          // Décaler toutes les transactions de la nouvelle date avec un ordre >= newOrder
          const transactionsToShift = sameDateTransactions.filter((t) => t.order >= validatedData.order!);
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
          // Calculer le nouvel ordre automatiquement : dernier ordre de cette date + 1
          const maxOrder = sameDateTransactions.length > 0
            ? Math.max(...sameDateTransactions.map((t) => t.order))
            : -1;
          updateData.order = maxOrder + 1;
        }
      }
    }
    
    // Si l'ordre change sans changement de date
    if (validatedData.order !== undefined && !updateData.order) {
      const normalizedCurrentDate = new Date(transaction.date);
      normalizedCurrentDate.setHours(0, 0, 0, 0);
      
      // Find all transactions with the same date
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
          // L'ordre diminue : décaler les transactions entre newOrder et oldOrder vers le haut
          const transactionsToShift = sameDateTransactions.filter((t) => 
            t.order >= newOrder && t.order < oldOrder
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
          // L'ordre augmente : décaler les transactions entre oldOrder et newOrder vers le bas
          const transactionsToShift = sameDateTransactions.filter((t) => 
            t.order > oldOrder && t.order <= newOrder
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

    // Recalculer le solde de la semaine
    await recalculateWeekBalance(transaction.weekId);

    return {
      status: 200,
      data: updatedTransaction,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification de la transaction');
  }
}

/**
 * Deletes a transaction
 */
export async function deleteTransaction(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

    const validatedData = deleteTransactionSchema.parse(data);

    const transaction = await prisma.bankTransaction.findUnique({
      where: { id: validatedData.id },
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

    const accessCheck = await checkAccountAccess(transaction.week.accountId, session.user.id, true);
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès en écriture requis',
      };
    }

    // Normaliser la date de la transaction à supprimer
    const transactionDate = new Date(transaction.date);
    transactionDate.setHours(0, 0, 0, 0);
    const transactionOrder = transaction.order;

    // Récupérer toutes les transactions de la même date avec un ordre supérieur
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

    // Trouver les transactions de la même date avec un ordre > transactionOrder
    const sameDateTransactions = allTransactions.filter((t) => {
      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);
      return tDate.getTime() === transactionDate.getTime() && t.order > transactionOrder;
    });

    // Décaler les transactions suivantes vers le bas (décrémenter leur ordre)
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

    // Recalculer le solde de la semaine
    await recalculateWeekBalance(transaction.weekId);

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la transaction');
  }
}
