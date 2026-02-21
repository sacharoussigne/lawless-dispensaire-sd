'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { startOfWeek, endOfWeek, parseISO } from 'date-fns';

// Schémas de validation
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
  userId: z.string().uuid('ID d\'utilisateur invalide'),
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
  credit: z.number().nonnegative('Le crédit doit être positif ou nul').optional(),
  debit: z.number().nonnegative('Le débit doit être positif ou nul').optional(),
  order: z.number().int().default(0),
});

const updateTransactionSchema = z.object({
  id: z.string().uuid('ID invalide'),
  date: z.string().or(z.date()).optional(),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT']).optional(),
  name: z.string().min(1, 'Le nom est requis').optional(),
  description: z.string().optional(),
  credit: z.number().nonnegative('Le crédit doit être positif ou nul').optional(),
  debit: z.number().nonnegative('Le débit doit être positif ou nul').optional(),
  order: z.number().int().optional(),
});

const deleteTransactionSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

// Fonction utilitaire pour obtenir le lundi et dimanche d'une semaine
function getWeekBounds(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Lundi
  const end = endOfWeek(date, { weekStartsOn: 1 }); // Dimanche
  return { start, end };
}

/**
 * Vérifie si l'utilisateur a accès au compte (propriétaire ou accès)
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

  // Le propriétaire a toujours accès
  if (account.ownerId === userId) {
    return { hasAccess: true };
  }

  // Vérifier les accès
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
 * Crée un nouveau compte bancaire
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
 * Récupère tous les comptes bancaires accessibles par l'utilisateur
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
 * Récupère un compte bancaire par son ID
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
 * Modifie un compte bancaire
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
 * Supprime un compte bancaire
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
 * Crée un accès à un compte bancaire
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

    // Seul le propriétaire peut donner accès
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

    // Ne pas permettre de donner accès à soi-même
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
 * Supprime un accès à un compte bancaire
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

    // Seul le propriétaire peut supprimer un accès
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
 * Récupère ou crée une semaine pour un compte
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

    // Chercher la semaine existante
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

    // Si elle n'existe pas, la créer
    if (!week) {
      // Récupérer le solde de la semaine précédente
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

    return {
      status: 200,
      data: week,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération de la semaine');
  }
}

/**
 * Récupère toutes les semaines d'un compte
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

    return {
      status: 200,
      data: weeks,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des semaines');
  }
}

/**
 * Crée une transaction
 */
export async function createTransaction(data: {
  weekId: string;
  date: string | Date;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  name: string;
  description?: string;
  credit?: number;
  debit?: number;
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

    // Vérifier l'accès via la semaine
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

    // Valider que credit ou debit est fourni selon le type
    if (validatedData.type === 'DEPOSIT' || validatedData.type === 'TRANSFER_IN') {
      if (!validatedData.credit || validatedData.credit <= 0) {
        return {
          status: 400,
          error: 'Un crédit est requis pour ce type de transaction',
        };
      }
      validatedData.debit = undefined;
    } else {
      if (!validatedData.debit || validatedData.debit <= 0) {
        return {
          status: 400,
          error: 'Un débit est requis pour ce type de transaction',
        };
      }
      validatedData.credit = undefined;
    }

    const date = typeof validatedData.date === 'string' ? parseISO(validatedData.date) : validatedData.date;

    const transaction = await prisma.bankTransaction.create({
      data: {
        weekId: validatedData.weekId,
        date,
        type: validatedData.type,
        name: validatedData.name,
        description: validatedData.description,
        credit: validatedData.credit,
        debit: validatedData.debit,
        order: validatedData.order || 0,
      },
    });

    // Sauvegarder les suggestions
    if (validatedData.name) {
      await prisma.transactionNameSuggestion.upsert({
        where: { value: validatedData.name },
        update: {},
        create: { value: validatedData.name },
      });
    }

    if (validatedData.description) {
      await prisma.transactionDescriptionSuggestion.upsert({
        where: { value: validatedData.description },
        update: {},
        create: { value: validatedData.description },
      });
    }

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
 * Modifie une transaction
 */
export async function updateTransaction(data: {
  id: string;
  date?: string | Date;
  type?: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  name?: string;
  description?: string;
  credit?: number;
  debit?: number;
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

    // Valider credit/debit selon le type
    const type = validatedData.type || transaction.type;
    if (type === 'DEPOSIT' || type === 'TRANSFER_IN') {
      if (validatedData.debit !== undefined && validatedData.debit > 0) {
        return {
          status: 400,
          error: 'Un crédit est requis pour ce type de transaction',
        };
      }
    } else {
      if (validatedData.credit !== undefined && validatedData.credit > 0) {
        return {
          status: 400,
          error: 'Un débit est requis pour ce type de transaction',
        };
      }
    }

    const updateData: any = {};
    if (validatedData.date !== undefined) {
      updateData.date = typeof validatedData.date === 'string' ? parseISO(validatedData.date) : validatedData.date;
    }
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.credit !== undefined) updateData.credit = validatedData.credit;
    if (validatedData.debit !== undefined) updateData.debit = validatedData.debit;
    if (validatedData.order !== undefined) updateData.order = validatedData.order;

    const updatedTransaction = await prisma.bankTransaction.update({
      where: { id: validatedData.id },
      data: updateData,
    });

    // Sauvegarder les suggestions
    if (validatedData.name) {
      await prisma.transactionNameSuggestion.upsert({
        where: { value: validatedData.name },
        update: {},
        create: { value: validatedData.name },
      });
    }

    if (validatedData.description) {
      await prisma.transactionDescriptionSuggestion.upsert({
        where: { value: validatedData.description },
        update: {},
        create: { value: validatedData.description },
      });
    }

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
 * Supprime une transaction
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
 * Recalcule le solde d'une semaine
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

  // Récupérer le solde de la semaine précédente
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

  // Calculer le solde en additionnant/soustrayant les transactions
  for (const transaction of week.transactions) {
    if (transaction.credit) {
      balance += Number(transaction.credit);
    }
    if (transaction.debit) {
      balance -= Number(transaction.debit);
    }
  }

  // Mettre à jour le solde de la semaine
  await prisma.bankAccountWeek.update({
    where: { id: weekId },
    data: {
      balance,
    },
  });
}

/**
 * Récupère les suggestions de noms
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
 * Récupère les suggestions de descriptions
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
