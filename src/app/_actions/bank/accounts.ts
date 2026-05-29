'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

import {
  createBankAccountSchema,
  updateBankAccountSchema,
  deleteBankAccountSchema,
} from '@/app/_actions/bank/schemas';
import { checkAccountAccess } from '@/app/_actions/bank/internals';

export async function createBankAccount(
  dispensarySlug: string,
  data: { name: string },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'bank',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;
    const { session } = ctx;

    const validatedData = createBankAccountSchema.parse(data);

    const account = await prisma.bankAccount.create({
      data: {
        dispensaryId,
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

export async function getBankAccounts(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'bank',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;
    const { session } = ctx;

    const accounts = await prisma.bankAccount.findMany({
      where: {
        ...tenantWhere(dispensaryId),
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

export async function getBankAccount(dispensarySlug: string, accountId: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'bank',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;
    const { session } = ctx;

    const accessCheck = await checkAccountAccess(dispensaryId, accountId, session.user.id);
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès non autorisé',
      };
    }

    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, ...tenantWhere(dispensaryId) },
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

export async function updateBankAccount(
  dispensarySlug: string,
  data: { id: string; name: string },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'bank',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;
    const { session } = ctx;

    const validatedData = updateBankAccountSchema.parse(data);

    const accessCheck = await checkAccountAccess(
      dispensaryId,
      validatedData.id,
      session.user.id,
      true,
    );
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

export async function deleteBankAccount(
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

    const validatedData = deleteBankAccountSchema.parse(data);

    const account = await prisma.bankAccount.findFirst({
      where: { id: validatedData.id, ...tenantWhere(dispensaryId) },
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
