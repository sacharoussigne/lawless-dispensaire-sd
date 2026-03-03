'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { startOfWeek, endOfWeek, parseISO } from 'date-fns';

const createBankAccountSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
});

const updateBankAccountSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
});

const deleteBankAccountSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

const createBankAccountAccessSchema = z.object({
  accountId: z.string().uuid('ID de compte invalide'),
  userId: z.string().min(1, 'ID d\'utilisateur requis'),
  accessType: z.enum(['READ', 'WRITE']),
});

const deleteBankAccountAccessSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

const createTransactionSchema = z.object({
  weekId: z.string().uuid('ID de semaine invalide'),
  date: z.string().or(z.date()),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT']),
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  amount: z.number().positive('Le montant doit être positif'),
  order: z.number().int().default(0),
});

const updateTransactionSchema = z.object({
  id: z.string().uuid('ID invalide'),
  date: z.string().or(z.date()).optional(),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT']).optional(),
  name: z.string().min(1, 'Le nom est requis').optional(),
  description: z.string().optional(),
  amount: z.number().positive('Le montant doit être positif').optional(),
  order: z.number().int().optional(),
});

const deleteTransactionSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

// Utility function to get Monday and Sunday of a week
function getWeekBounds(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return { start, end };
}

/**
 * Checks if the user has access to the account (owner or access)
 */
async function checkAccountAccess(accountId: string, userId: string, requireWrite: boolean = false) {
  const account = await prisma.bankAccount.findUnique({
    where: { id: accountId },
    include: {
      accesses: {
        where: { userId },
      },
    },
  });

  if (!account) {
    return { hasAccess: false, error: 'Compte introuvable' };
  }

  // Owner always has access
  if (account.ownerId === userId) {
    return { hasAccess: true };
  }

  // Check access
  const access = account.accesses[0];
  if (!access) {
    return { hasAccess: false, error: 'Accès non autorisé' };
  }

  if (requireWrite && access.accessType !== 'WRITE') {
    return { hasAccess: false, error: 'Accès en écriture requis' };
  }

  return { hasAccess: true };
}

/**
 * Creates a new bank account
 */
export async function createBankAccount(data: { name: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createBankAccountSchema.parse(data);

    const account = await prisma.bankAccount.create({
      data: {
        name: validatedData.name,
        ownerId: session.user.id,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        accesses: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return {
      status: 201,
      data: account,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du compte bancaire');
  }
}

/**
 * Gets all bank accounts accessible by the user
 */
export async function getBankAccounts() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const accounts = await prisma.bankAccount.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          {
            accesses: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        accesses: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      status: 200,
      data: accounts,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des comptes bancaires');
  }
}

/**
 * Gets a bank account by its ID
 */
export async function getBankAccount(accountId: string) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const accessCheck = await checkAccountAccess(accountId, session.user.id);
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès non autorisé',
      };
    }

    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        accesses: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!account) {
      return {
        status: 404,
        error: 'Compte introuvable',
      };
    }

    return {
      status: 200,
      data: account,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération du compte bancaire');
  }
}

/**
 * Updates a bank account
 */
export async function updateBankAccount(data: { id: string; name: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = updateBankAccountSchema.parse(data);

    const accessCheck = await checkAccountAccess(validatedData.id, session.user.id, true);
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès en écriture requis',
      };
    }

    const account = await prisma.bankAccount.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        accesses: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return {
      status: 200,
      data: account,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification du compte bancaire');
  }
}

/**
 * Deletes a bank account
 */
export async function deleteBankAccount(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteBankAccountSchema.parse(data);

    // Seul le propriétaire peut supprimer
    const account = await prisma.bankAccount.findUnique({
      where: { id: validatedData.id },
      select: { ownerId: true },
    });

    if (!account) {
      return {
        status: 404,
        error: 'Compte introuvable',
      };
    }

    if (account.ownerId !== session.user.id) {
      return {
        status: 403,
        error: 'Seul le propriétaire peut supprimer le compte',
      };
    }

    await prisma.bankAccount.delete({
      where: { id: validatedData.id },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du compte bancaire');
  }
}

/**
 * Creates access to a bank account
 */
export async function createBankAccountAccess(data: {
  accountId: string;
  userId: string;
  accessType: 'READ' | 'WRITE';
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createBankAccountAccessSchema.parse(data);

    // Only the owner can grant access
    const account = await prisma.bankAccount.findUnique({
      where: { id: validatedData.accountId },
      select: { ownerId: true },
    });

    if (!account) {
      return {
        status: 404,
        error: 'Compte introuvable',
      };
    }

    if (account.ownerId !== session.user.id) {
      return {
        status: 403,
        error: 'Seul le propriétaire peut donner accès au compte',
      };
    }

    // Do not allow granting access to oneself
    if (validatedData.userId === session.user.id) {
      return {
        status: 400,
        error: 'Vous ne pouvez pas vous donner accès à votre propre compte',
      };
    }

    const access = await prisma.bankAccountAccess.create({
      data: {
        accountId: validatedData.accountId,
        userId: validatedData.userId,
        accessType: validatedData.accessType,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      status: 201,
      data: access,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de l\'accès');
  }
}

/**
 * Deletes access to a bank account
 */
export async function deleteBankAccountAccess(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteBankAccountAccessSchema.parse(data);

    // Only the owner can delete access
    const access = await prisma.bankAccountAccess.findUnique({
      where: { id: validatedData.id },
      include: {
        account: {
          select: { ownerId: true },
        },
      },
    });

    if (!access) {
      return {
        status: 404,
        error: 'Accès introuvable',
      };
    }

    if (access.account.ownerId !== session.user.id) {
      return {
        status: 403,
        error: 'Seul le propriétaire peut supprimer un accès',
      };
    }

    await prisma.bankAccountAccess.delete({
      where: { id: validatedData.id },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de l\'accès');
  }
}

/**
 * Gets or creates a week for an account
 */
export async function getOrCreateWeek(accountId: string, date: Date) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const accessCheck = await checkAccountAccess(accountId, session.user.id);
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès non autorisé',
      };
    }

    const { start, end } = getWeekBounds(date);

    // Find existing week
    let week = await prisma.bankAccountWeek.findUnique({
      where: {
        accountId_weekStart: {
          accountId,
          weekStart: start,
        },
      },
      include: {
        transactions: {
          orderBy: [
            { order: 'asc' },
            { date: 'asc' },
          ],
        },
      },
    });

    // If it doesn't exist, create it
    if (!week) {
      // Get previous week balance
      const previousWeek = await prisma.bankAccountWeek.findFirst({
        where: {
          accountId,
          weekStart: {
            lt: start,
          },
        },
        orderBy: {
          weekStart: 'desc',
        },
      });

      week = await prisma.bankAccountWeek.create({
        data: {
          accountId,
          weekStart: start,
          weekEnd: end,
          balance: previousWeek ? previousWeek.balance : 0,
        },
        include: {
          transactions: {
            orderBy: [
              { order: 'asc' },
              { date: 'asc' },
            ],
          },
        },
      });
    }

    const serializedWeek = {
      ...week,
      balance: Number(week.balance),
      transactions: week.transactions.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
      })),
    };

    return {
      status: 200,
      data: serializedWeek,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération de la semaine');
  }
}

/**
 * Gets all weeks of an account
 */
export async function getAccountWeeks(accountId: string) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const accessCheck = await checkAccountAccess(accountId, session.user.id);
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès non autorisé',
      };
    }

    const weeks = await prisma.bankAccountWeek.findMany({
      where: { accountId },
      orderBy: {
        weekStart: 'desc',
      },
      include: {
        transactions: {
          orderBy: [
            { order: 'asc' },
            { date: 'asc' },
          ],
        },
      },
    });

    const serializedWeeks = weeks.map((week) => ({
      ...week,
      balance: Number(week.balance),
      transactions: week.transactions.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
      })),
    }));

    return {
      status: 200,
      data: serializedWeeks,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des semaines');
  }
}

/**
 * Creates a transaction
 */
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

/**
 * Recalculates the balance of a week and all following weeks
 * (because a week's balance depends on the previous week's balance)
 */
async function recalculateWeekBalance(weekId: string) {
  const week = await prisma.bankAccountWeek.findUnique({
    where: { id: weekId },
    include: {
      transactions: {
        orderBy: [
          { order: 'asc' },
          { date: 'asc' },
        ],
      },
    },
  });

  if (!week) return;

  // Get previous week balance
  const previousWeek = await prisma.bankAccountWeek.findFirst({
    where: {
      accountId: week.accountId,
      weekStart: {
        lt: week.weekStart,
      },
    },
    orderBy: {
      weekStart: 'desc',
    },
  });

  let balance = previousWeek ? Number(previousWeek.balance) : 0;

  // Calculer le solde en additionnant/soustrayant les transactions selon le type
  for (const transaction of week.transactions) {
    const amount = Number(transaction.amount);
    if (transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN') {
      balance += amount;
    } else {
      // WITHDRAWAL ou TRANSFER_OUT
      balance -= amount;
    }
  }

  // Mettre à jour le solde de la semaine
  await prisma.bankAccountWeek.update({
    where: { id: weekId },
    data: {
      balance,
    },
  });

  // Recalculer toutes les semaines suivantes car elles dépendent de ce balance
  const followingWeeks = await prisma.bankAccountWeek.findMany({
    where: {
      accountId: week.accountId,
      weekStart: {
        gt: week.weekStart,
      },
    },
    orderBy: {
      weekStart: 'asc',
    },
    include: {
      transactions: {
        orderBy: [
          { order: 'asc' },
          { date: 'asc' },
        ],
      },
    },
  });

  // Recalculer chaque semaine suivante en utilisant le balance de la semaine précédente
  let currentBalance = balance;
  for (const followingWeek of followingWeeks) {
    // Le solde initial de cette semaine est le solde final de la semaine précédente
    let weekBalance = currentBalance;

    // Calculer le solde en additionnant/soustrayant les transactions selon le type
    for (const transaction of followingWeek.transactions) {
      const amount = Number(transaction.amount);
      if (transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN') {
        weekBalance += amount;
      } else {
        // WITHDRAWAL ou TRANSFER_OUT
        weekBalance -= amount;
      }
    }

    // Mettre à jour le solde de la semaine
    await prisma.bankAccountWeek.update({
      where: { id: followingWeek.id },
      data: {
        balance: weekBalance,
      },
    });

    // Le solde final de cette semaine devient le solde initial de la semaine suivante
    currentBalance = weekBalance;
  }
}

/**
 * Gets name suggestions
 */
export async function getNameSuggestions() {
  try {
    const suggestions = await prisma.transactionNameSuggestion.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return {
      status: 200,
      data: suggestions.map(s => s.value),
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des suggestions de noms');
  }
}

/**
 * Gets description suggestions
 */
export async function getDescriptionSuggestions() {
  try {
    const suggestions = await prisma.transactionDescriptionSuggestion.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return {
      status: 200,
      data: suggestions.map(s => s.value),
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des suggestions de descriptions');
  }
}

/**
 * Adds a name suggestion
 */
export async function addNameSuggestion(data: { value: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    if (!data.value || data.value.trim().length === 0) {
      return {
        status: 400,
        error: 'Le nom ne peut pas être vide',
      };
    }

    const suggestion = await prisma.transactionNameSuggestion.upsert({
      where: { value: data.value.trim() },
      update: {},
      create: { value: data.value.trim() },
    });

    return {
      status: 201,
      data: suggestion.value,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de l\'ajout de la suggestion de nom');
  }
}

/**
 * Adds a description suggestion
 */
export async function addDescriptionSuggestion(data: { value: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    if (!data.value || data.value.trim().length === 0) {
      return {
        status: 400,
        error: 'La description ne peut pas être vide',
      };
    }

    const suggestion = await prisma.transactionDescriptionSuggestion.upsert({
      where: { value: data.value.trim() },
      update: {},
      create: { value: data.value.trim() },
    });

    return {
      status: 201,
      data: suggestion.value,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de l\'ajout de la suggestion de description');
  }
}

/**
 * Deletes a name suggestion
 */
export async function deleteNameSuggestion(data: { value: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    if (!data.value || data.value.trim().length === 0) {
      return {
        status: 400,
        error: 'Le nom ne peut pas être vide',
      };
    }

    await prisma.transactionNameSuggestion.delete({
      where: { value: data.value.trim() },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la suggestion de nom');
  }
}

/**
 * Deletes a description suggestion
 */
export async function deleteDescriptionSuggestion(data: { value: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    if (!data.value || data.value.trim().length === 0) {
      return {
        status: 400,
        error: 'La description ne peut pas être vide',
      };
    }

    await prisma.transactionDescriptionSuggestion.delete({
      where: { value: data.value.trim() },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la suggestion de description');
  }
}
