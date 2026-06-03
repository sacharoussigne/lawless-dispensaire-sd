'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

import {
  createBankAccountAccessSchema,
  deleteBankAccountAccessSchema,
} from '@/app/_actions/bank/schemas';

export async function createBankAccountAccess(
  dispensarySlug: string,
  data: {
    accountId: string;
    userId: string;
    accessType: 'READ' | 'WRITE';
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'bank',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;
    const { session } = ctx;

    const validatedData = createBankAccountAccessSchema.parse(data);

    const account = await prisma.bankAccount.findFirst({
      where: { id: validatedData.accountId, ...tenantWhere(dispensaryId) },
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

export async function deleteBankAccountAccess(
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

    const validatedData = deleteBankAccountAccessSchema.parse(data);

    const access = await prisma.bankAccountAccess.findFirst({
      where: {
        id: validatedData.id,
        account: tenantWhere(dispensaryId),
      },
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
