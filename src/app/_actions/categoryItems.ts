'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

const createCategoryItemSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  color: z.string().min(1, 'La couleur est requise').max(7, 'La couleur doit être au format hexadécimal').default('#ffffff'),
});

const updateCategoryItemSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  color: z.string().min(1, 'La couleur est requise').max(7, 'La couleur doit être au format hexadécimal').default('#ffffff'),
});

const deleteCategoryItemSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

const reorderCategoryItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid('ID invalide'),
    order: z.number().int(),
  })),
});

export async function createCategoryItem(
  dispensarySlug: string,
  data: {
    name: string;
    color?: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = createCategoryItemSchema.parse(data);

    const lastCategory = await prisma.categoryItem.findFirst({
      where: tenantWhere(dispensaryId),
      orderBy: {
        order: 'desc',
      },
      select: {
        order: true,
      },
    });

    const newOrder = lastCategory ? lastCategory.order + 1 : 0;

    const categoryItem = await prisma.categoryItem.create({
      data: {
        dispensaryId,
        name: validatedData.name,
        color: validatedData.color || '#ffffff',
        order: newOrder,
      },
    });

    return {
      status: 201,
      data: categoryItem,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de la catégorie d\'objet');
  }
}

export async function getCategoryItems(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const categoryItems = await prisma.categoryItem.findMany({
      where: tenantWhere(dispensaryId),
      orderBy: {
        order: 'asc',
      },
      include: {
        items: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      status: 200,
      data: categoryItems,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des catégories d\'objets');
  }
}

export async function getManagementCategoryItems(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const categoryItems = await prisma.categoryItem.findMany({
      where: tenantWhere(dispensaryId),
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { items: true } },
      },
    });

    return {
      status: 200,
      data: categoryItems,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des catégories d\'objets');
  }
}

export async function updateCategoryItem(
  dispensarySlug: string,
  data: {
    id: string;
    name: string;
    color?: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = updateCategoryItemSchema.parse(data);

    const categoryItem = await prisma.categoryItem.update({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
      data: {
        name: validatedData.name,
        color: validatedData.color || '#ffffff',
      },
    });

    return {
      status: 200,
      data: categoryItem,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification de la catégorie d\'objet');
  }
}

export async function deleteCategoryItem(dispensarySlug: string, data: { id: string }) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = deleteCategoryItemSchema.parse(data);

    await prisma.categoryItem.delete({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la catégorie d\'objet');
  }
}

export async function reorderCategoryItems(
  dispensarySlug: string,
  data: { items: { id: string; order: number }[] },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = reorderCategoryItemsSchema.parse(data);

    await prisma.$transaction(
      validatedData.items.map(({ id, order }) =>
        prisma.categoryItem.update({
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
    return actionErrorParser(error, 'Erreur lors du réordonnancement des catégories d\'objets');
  }
}
