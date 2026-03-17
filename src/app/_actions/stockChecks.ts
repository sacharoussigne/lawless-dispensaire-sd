'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { checkRolePermission } from '@/lib/auth/permissions';

const upsertChestStockCheckConfigSchema = z.object({
  chestId: z.string().uuid('ID de coffre invalide'),
  isEnabled: z.boolean(),
  categoryIds: z.array(z.string().uuid('ID de catégorie invalide')),
});

export type ChestStockCheckConfigDTO = {
  chestId: string;
  isEnabled: boolean;
  categoryIds: string[];
};

export type CategoryItemDTO = {
  id: string;
  name: string;
  color: string;
  order: number;
};

export type ChestStockCheckConfigsResponse = {
  chests: { id: string; name: string; isEnabled: boolean; order: number }[];
  categories: CategoryItemDTO[];
  configsByChestId: Record<string, ChestStockCheckConfigDTO>;
};

/**
 * Gets chests + categories + current stock check configs (admin only).
 */
export async function getChestStockCheckConfigs() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return { status: 401, error: 'Non autorisé' };
    }

    const userRole = session.user?.role;
    if (!checkRolePermission(userRole, 'application', 'management')) {
      return { status: 403, error: 'Permission refusée' };
    }

    const [chests, categories, configs] = await Promise.all([
      prisma.chest.findMany({
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, name: true, isEnabled: true, order: true },
      }),
      prisma.categoryItem.findMany({
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, color: true, order: true },
      }),
      prisma.chestStockCheckConfig.findMany({
        select: {
          chestId: true,
          isEnabled: true,
          categories: { select: { categoryId: true } },
        },
      }),
    ]);

    const configsByChestId: Record<string, ChestStockCheckConfigDTO> = Object.fromEntries(
      configs.map((c) => [
        c.chestId,
        {
          chestId: c.chestId,
          isEnabled: c.isEnabled,
          categoryIds: c.categories.map((x) => x.categoryId),
        },
      ]),
    );

    const payload: ChestStockCheckConfigsResponse = {
      chests,
      categories,
      configsByChestId,
    };

    return { status: 200, data: payload };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement des vérifications de stock');
  }
}

/**
 * Creates or updates a chest stock check config, replacing category selection (admin only).
 */
export async function upsertChestStockCheckConfig(input: {
  chestId: string;
  isEnabled: boolean;
  categoryIds: string[];
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return { status: 401, error: 'Non autorisé' };
    }

    const userRole = session.user?.role;
    if (!checkRolePermission(userRole, 'application', 'management')) {
      return { status: 403, error: 'Permission refusée' };
    }

    const validated = upsertChestStockCheckConfigSchema.parse(input);

    const config = await prisma.$transaction(async (tx) => {
      const upserted = await tx.chestStockCheckConfig.upsert({
        where: { chestId: validated.chestId },
        create: {
          chestId: validated.chestId,
          isEnabled: validated.isEnabled,
        },
        update: {
          isEnabled: validated.isEnabled,
        },
        select: { id: true, chestId: true, isEnabled: true },
      });

      await tx.chestStockCheckCategory.deleteMany({
        where: { configId: upserted.id },
      });

      const uniqueCategoryIds = Array.from(new Set(validated.categoryIds));
      if (uniqueCategoryIds.length > 0) {
        await tx.chestStockCheckCategory.createMany({
          data: uniqueCategoryIds.map((categoryId) => ({
            configId: upserted.id,
            categoryId,
          })),
        });
      }

      return upserted;
    });

    return { status: 200, data: config };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la sauvegarde des vérifications de stock');
  }
}

export type StockChecksSummary = {
  enabledChestIds: string[];
  configsByChestId: Record<string, ChestStockCheckConfigDTO>;
};

/**
 * Gets a lightweight summary for the stock page (stock view permission).
 */
export async function getStockChecksSummary() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return { status: 401, error: 'Non autorisé' };
    }

    const userRole = session.user?.role;
    if (!checkRolePermission(userRole, 'stock', 'view')) {
      return { status: 403, error: 'Permission refusée' };
    }

    const [enabledChests, configs] = await Promise.all([
      prisma.chest.findMany({
        where: { isEnabled: true },
        select: { id: true },
      }),
      prisma.chestStockCheckConfig.findMany({
        select: {
          chestId: true,
          isEnabled: true,
          categories: { select: { categoryId: true } },
        },
      }),
    ]);

    const configsByChestId: Record<string, ChestStockCheckConfigDTO> = Object.fromEntries(
      configs.map((c) => [
        c.chestId,
        {
          chestId: c.chestId,
          isEnabled: c.isEnabled,
          categoryIds: c.categories.map((x) => x.categoryId),
        },
      ]),
    );

    const payload: StockChecksSummary = {
      enabledChestIds: enabledChests.map((c) => c.id),
      configsByChestId,
    };

    return { status: 200, data: payload };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement des vérifications de stock');
  }
}

