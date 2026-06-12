'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

const createItemSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  minimalQuantity: z.number().int().min(0, 'La quantité minimale doit être positive'),
  isCraftable: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  canBeSold: z.boolean().default(false),
  price: z.number().positive('Le prix doit être positif').optional().nullable(),
  weight: z.number().positive('Le poids doit être positif').optional().nullable(),
  categoryId: z.string().uuid('ID de catégorie invalide').min(1, 'La catégorie est requise'),
  companyGroupId: z.string().uuid('ID de groupe d\'entreprise invalide').optional(),
});

const updateItemSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  minimalQuantity: z.number().int().min(0, 'La quantité minimale doit être positive'),
  isCraftable: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  canBeSold: z.boolean().default(false),
  price: z.number().positive('Le prix doit être positif').optional().nullable(),
  weight: z.number().positive('Le poids doit être positif').optional().nullable(),
  categoryId: z.string().uuid('ID de catégorie invalide').min(1, 'La catégorie est requise'),
  companyGroupId: z.string().uuid('ID de groupe d\'entreprise invalide').optional(),
});

const deleteItemSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

const reorderItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid('ID invalide'),
    order: z.number().int(),
  })),
});

async function validateItemRelations(
  dispensaryId: string,
  categoryId: string,
  companyGroupId?: string,
): Promise<{ ok: true } | { ok: false; response: { status: number; error: string } }> {
  const category = await prisma.categoryItem.findFirst({
    where: { id: categoryId, ...tenantWhere(dispensaryId) },
  });
  if (!category) {
    return { ok: false, response: { status: 400, error: 'Catégorie invalide' } };
  }

  if (companyGroupId) {
    const companyGroup = await prisma.companyGroup.findFirst({
      where: { id: companyGroupId, ...tenantWhere(dispensaryId) },
    });
    if (!companyGroup) {
      return { ok: false, response: { status: 400, error: 'Groupe d\'entreprises invalide' } };
    }
  }

  return { ok: true };
}

export async function createItem(
  dispensarySlug: string,
  data: {
    name: string;
    description?: string;
    minimalQuantity: number;
    isCraftable?: boolean;
    isEnabled?: boolean;
    canBeSold?: boolean;
    price?: number | null;
    weight?: number | null;
    categoryId: string;
    companyGroupId?: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = createItemSchema.parse(data);

    const relationsResult = await validateItemRelations(
      dispensaryId,
      validatedData.categoryId,
      validatedData.companyGroupId,
    );
    if (!relationsResult.ok) return relationsResult.response;

    const lastItem = await prisma.item.findFirst({
      where: {
        categoryId: validatedData.categoryId,
        ...tenantWhere(dispensaryId),
      },
      orderBy: {
        order: 'desc',
      },
      select: {
        order: true,
      },
    });

    const newOrder = lastItem ? lastItem.order + 1 : 0;

    const item = await prisma.item.create({
      data: {
        dispensaryId,
        name: validatedData.name,
        description: validatedData.description,
        minimalQuantity: validatedData.minimalQuantity,
        isCraftable: validatedData.isCraftable ?? false,
        isEnabled: validatedData.isEnabled ?? true,
        canBeSold: validatedData.canBeSold ?? false,
        price: validatedData.price !== undefined && validatedData.price !== null ? validatedData.price : null,
        weight: validatedData.weight !== undefined && validatedData.weight !== null ? validatedData.weight : null,
        categoryId: validatedData.categoryId,
        companyGroupId: validatedData.companyGroupId,
        order: newOrder,
      },
    });

    return {
      status: 201,
      data: {
        ...item,
        price: item.price ? Number(item.price) : null,
      },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de l\'objet');
  }
}

export async function getItems(
  dispensarySlug: string,
  options?: { companyGroupId?: string | null },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const items = await prisma.item.findMany({
      where: {
        ...tenantWhere(dispensaryId),
        ...(options?.companyGroupId
          ? { companyGroupId: options.companyGroupId }
          : {}),
      },
      orderBy: [
        {
          category: {
            order: 'asc',
          },
        },
        {
          order: 'asc',
        },
        {
          name: 'asc',
        },
      ],
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
          },
        },
        companyGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const serializedItems = items.map((item) => ({
      ...item,
      price: item.price ? Number(item.price) : null,
    }));

    return {
      status: 200,
      data: serializedItems,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des objets');
  }
}

export async function updateItem(
  dispensarySlug: string,
  data: {
    id: string;
    name: string;
    description?: string;
    minimalQuantity: number;
    isCraftable?: boolean;
    isEnabled?: boolean;
    canBeSold?: boolean;
    price?: number | null;
    weight?: number | null;
    categoryId: string;
    companyGroupId?: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = updateItemSchema.parse(data);

    const relationsResult = await validateItemRelations(
      dispensaryId,
      validatedData.categoryId,
      validatedData.companyGroupId,
    );
    if (!relationsResult.ok) return relationsResult.response;

    const item = await prisma.item.update({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        minimalQuantity: validatedData.minimalQuantity,
        isCraftable: validatedData.isCraftable ?? false,
        isEnabled: validatedData.isEnabled ?? true,
        canBeSold: validatedData.canBeSold ?? false,
        price: validatedData.price !== undefined && validatedData.price !== null ? validatedData.price : null,
        weight: validatedData.weight !== undefined && validatedData.weight !== null ? validatedData.weight : null,
        categoryId: validatedData.categoryId,
        companyGroupId: validatedData.companyGroupId,
      },
    });

    return {
      status: 200,
      data: {
        ...item,
        price: item.price ? Number(item.price) : null,
      },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification de l\'objet');
  }
}

export async function deleteItem(dispensarySlug: string, data: { id: string }) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = deleteItemSchema.parse(data);

    await prisma.item.delete({
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
    return actionErrorParser(error, 'Erreur lors de la suppression de l\'objet');
  }
}

export async function reorderItems(
  dispensarySlug: string,
  data: { items: { id: string; order: number }[] },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = reorderItemsSchema.parse(data);

    await Promise.all(
      validatedData.items.map(({ id, order }) =>
        prisma.item.update({
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
    return actionErrorParser(error, 'Erreur lors du réordonnancement des objets');
  }
}
