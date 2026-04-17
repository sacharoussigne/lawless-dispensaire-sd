'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { getAppFeatureActionBlock } from '@/lib/appSettings';

import {
  createBankAccountSchema,
  updateBankAccountSchema,
  deleteBankAccountSchema,
} from '@/app/_actions/bank/schemas';
import { checkAccountAccess } from '@/app/_actions/bank/internals';

export async function createBankAccount(data: { name: string }) {
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

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

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

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

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

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

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

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

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
