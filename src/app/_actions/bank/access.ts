'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { getAppFeatureActionBlock } from '@/lib/appSettings';

import {
  createBankAccountAccessSchema,
  deleteBankAccountAccessSchema,
} from '@/app/_actions/bank/schemas';
import { checkAccountAccess } from '@/app/_actions/bank/internals';

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

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

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

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

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
