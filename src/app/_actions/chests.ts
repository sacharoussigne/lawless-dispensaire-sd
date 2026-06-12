'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

const createChestSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  isEnabled: z.boolean().default(true),
});

const updateChestSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  isEnabled: z.boolean(),
});

const deleteChestSchema = z.object({
  id: z.string().uuid('ID invalide'),
  targetChestId: z.string().uuid('ID de coffre de destination invalide'),
});

const reorderChestsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid('ID invalide'),
    order: z.number().int(),
  })),
});

export async function createChest(
  dispensarySlug: string,
  data: {
    name: string;
    description?: string;
    isEnabled?: boolean;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = createChestSchema.parse(data);

    const maxOrderResult = await prisma.chest.aggregate({
      where: tenantWhere(dispensaryId),
      _max: {
        order: true,
      },
    });
    const maxOrder = maxOrderResult._max.order ?? -1;
    const newOrder = maxOrder + 1;

    const chest = await prisma.chest.create({
      data: {
        dispensaryId,
        name: validatedData.name,
        description: validatedData.description,
        isEnabled: validatedData.isEnabled ?? true,
        order: newOrder,
      },
    });

    return {
      status: 201,
      data: chest,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du coffre');
  }
}

export async function getChests(dispensarySlug: string, onlyEnabled: boolean = false) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const chests = await prisma.chest.findMany({
      where: {
        ...tenantWhere(dispensaryId),
        ...(onlyEnabled && { isEnabled: true }),
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        _count: {
          select: { stockHistory: true },
        },
      },
    });

    return {
      status: 200,
      data: chests.map(({ _count, ...chest }) => ({
        ...chest,
        stockHistoryCount: _count.stockHistory,
      })),
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des coffres');
  }
}

export async function getChestsList(dispensarySlug: string, onlyEnabled: boolean = false) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const chests = await prisma.chest.findMany({
      where: {
        ...tenantWhere(dispensaryId),
        ...(onlyEnabled && { isEnabled: true }),
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        order: true,
      },
    });

    return {
      status: 200,
      data: chests,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des coffres');
  }
}

export async function updateChest(
  dispensarySlug: string,
  data: {
    id: string;
    name: string;
    description?: string;
    isEnabled?: boolean;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = updateChestSchema.parse(data);

    const chest = await prisma.chest.update({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        isEnabled: validatedData.isEnabled,
      },
    });

    return {
      status: 200,
      data: chest,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification du coffre');
  }
}

export async function deleteChest(
  dispensarySlug: string,
  data: { id: string; targetChestId: string },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = deleteChestSchema.parse(data);

    const totalChests = await prisma.chest.count({
      where: tenantWhere(dispensaryId),
    });
    if (totalChests <= 1) {
      return {
        status: 400,
        error: 'Impossible de supprimer le dernier coffre. Il doit y avoir au moins un coffre.',
      };
    }

    if (validatedData.id === validatedData.targetChestId) {
      return {
        status: 400,
        error: 'Le coffre de destination doit être différent du coffre à supprimer.',
      };
    }

    const targetChest = await prisma.chest.findFirst({
      where: {
        id: validatedData.targetChestId,
        ...tenantWhere(dispensaryId),
      },
    });

    if (!targetChest) {
      return {
        status: 404,
        error: 'Le coffre de destination n\'existe pas.',
      };
    }

    const chestToDelete = await prisma.chest.findFirst({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
    });

    if (!chestToDelete) {
      return {
        status: 404,
        error: 'Le coffre à supprimer n\'existe pas.',
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockHistory.updateMany({
        where: {
          chestId: validatedData.id,
          chest: tenantWhere(dispensaryId),
        },
        data: {
          chestId: validatedData.targetChestId,
        },
      });

      await tx.chest.delete({
        where: {
          id: validatedData.id,
          ...tenantWhere(dispensaryId),
        },
      });
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du coffre');
  }
}

export async function reorderChests(
  dispensarySlug: string,
  data: { items: { id: string; order: number }[] },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = reorderChestsSchema.parse(data);

    await Promise.all(
      validatedData.items.map(({ id, order }) =>
        prisma.chest.update({
          where: { id, ...tenantWhere(dispensaryId) },
          data: { order },
        }),
      ),
    );

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du réordonnancement des coffres');
  }
}
