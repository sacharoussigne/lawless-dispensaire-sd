'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

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

export type ChestStockCheckFormResponse = {
  categories: CategoryItemDTO[];
  config: ChestStockCheckConfigDTO | null;
};

export async function getChestStockCheckForm(dispensarySlug: string, chestId: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      permission: { resource: 'application', action: 'management' },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const [categories, configRow] = await Promise.all([
      prisma.categoryItem.findMany({
        where: tenantWhere(dispensaryId),
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, color: true, order: true },
      }),
      prisma.chestStockCheckConfig.findFirst({
        where: {
          chestId,
          chest: tenantWhere(dispensaryId),
        },
        select: {
          chestId: true,
          isEnabled: true,
          categories: { select: { categoryId: true } },
        },
      }),
    ]);

    const config: ChestStockCheckConfigDTO | null = configRow
      ? {
          chestId: configRow.chestId,
          isEnabled: configRow.isEnabled,
          categoryIds: configRow.categories.map((x) => x.categoryId),
        }
      : null;

    const payload: ChestStockCheckFormResponse = { categories, config };

    return { status: 200, data: payload };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement de la configuration');
  }
}

export async function getChestStockCheckConfigs(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      permission: { resource: 'application', action: 'management' },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const [chests, categories, configs] = await Promise.all([
      prisma.chest.findMany({
        where: tenantWhere(dispensaryId),
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, name: true, isEnabled: true, order: true },
      }),
      prisma.categoryItem.findMany({
        where: tenantWhere(dispensaryId),
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, color: true, order: true },
      }),
      prisma.chestStockCheckConfig.findMany({
        where: {
          chest: tenantWhere(dispensaryId),
        },
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

export async function upsertChestStockCheckConfig(
  dispensarySlug: string,
  input: {
    chestId: string;
    isEnabled: boolean;
    categoryIds: string[];
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      permission: { resource: 'application', action: 'management' },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validated = upsertChestStockCheckConfigSchema.parse(input);

    const chest = await prisma.chest.findFirst({
      where: { id: validated.chestId, ...tenantWhere(dispensaryId) },
    });
    if (!chest) {
      return { status: 404, error: 'Coffre introuvable' };
    }

    const uniqueCategoryIds = Array.from(new Set(validated.categoryIds));
    if (uniqueCategoryIds.length > 0) {
      const categories = await prisma.categoryItem.findMany({
        where: {
          id: { in: uniqueCategoryIds },
          ...tenantWhere(dispensaryId),
        },
        select: { id: true },
      });
      if (categories.length !== uniqueCategoryIds.length) {
        return { status: 400, error: 'Une ou plusieurs catégories sont invalides' };
      }
    }

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

export async function getStockChecksSummary(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      permission: { resource: 'stock', action: 'view' },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const [enabledChests, configs] = await Promise.all([
      prisma.chest.findMany({
        where: {
          isEnabled: true,
          ...tenantWhere(dispensaryId),
        },
        select: { id: true },
      }),
      prisma.chestStockCheckConfig.findMany({
        where: {
          chest: tenantWhere(dispensaryId),
        },
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
