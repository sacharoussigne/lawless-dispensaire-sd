'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

const createCompanyGroupSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  companyIds: z.array(z.string().uuid('ID d\'entreprise invalide')).optional(),
});

const updateCompanyGroupSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  companyIds: z.array(z.string().uuid('ID d\'entreprise invalide')).optional(),
});

const deleteCompanyGroupSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

async function validateCompanyIds(
  dispensaryId: string,
  companyIds: string[],
): Promise<{ ok: true } | { ok: false; response: { status: number; error: string } }> {
  if (companyIds.length === 0) {
    return { ok: true };
  }

  const companies = await prisma.company.findMany({
    where: {
      id: { in: companyIds },
      ...tenantWhere(dispensaryId),
    },
    select: { id: true },
  });

  if (companies.length !== companyIds.length) {
    return { ok: false, response: { status: 400, error: 'Une ou plusieurs entreprises sont invalides' } };
  }

  return { ok: true };
}

export async function createCompanyGroup(
  dispensarySlug: string,
  data: {
    name: string;
    description?: string;
    companyIds?: string[];
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = createCompanyGroupSchema.parse(data);

    if (validatedData.companyIds && validatedData.companyIds.length > 0) {
      const companiesResult = await validateCompanyIds(dispensaryId, validatedData.companyIds);
      if (!companiesResult.ok) return companiesResult.response;
    }

    const companyGroup = await prisma.companyGroup.create({
      data: {
        dispensaryId,
        name: validatedData.name,
        description: validatedData.description,
        companies: validatedData.companyIds
          ? {
              create: validatedData.companyIds.map((companyId) => ({
                companyId,
              })),
            }
          : undefined,
      },
      include: {
        items: {
          select: {
            id: true,
          },
        },
        companies: {
          include: {
            company: true,
          },
        },
      },
    });

    return {
      status: 201,
      data: companyGroup,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du groupe d\'entreprises');
  }
}

export async function getCompanyGroups(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const companyGroups = await prisma.companyGroup.findMany({
      where: tenantWhere(dispensaryId),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: {
          select: {
            id: true,
          },
        },
        companies: {
          include: {
            company: true,
          },
        },
      },
    });

    return {
      status: 200,
      data: companyGroups,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des groupes d\'entreprises');
  }
}

export async function updateCompanyGroup(
  dispensarySlug: string,
  data: {
    id: string;
    name: string;
    description?: string;
    companyIds?: string[];
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = updateCompanyGroupSchema.parse(data);

    const existingCompanyGroup = await prisma.companyGroup.findFirst({
      where: { id: validatedData.id, ...tenantWhere(dispensaryId) },
      include: {
        companies: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!existingCompanyGroup) {
      return { status: 404, error: 'Groupe d\'entreprises introuvable' };
    }

    const newCompanyIds = validatedData.companyIds || [];
    const companiesResult = await validateCompanyIds(dispensaryId, newCompanyIds);
    if (!companiesResult.ok) return companiesResult.response;

    const existingCompanyIds = existingCompanyGroup.companies.map((c) => c.companyId);
    const companyIdsToAdd = newCompanyIds.filter((id) => !existingCompanyIds.includes(id));
    const companyIdsToRemove = existingCompanyIds.filter((id) => !newCompanyIds.includes(id));

    const companyGroup = await prisma.companyGroup.update({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        companies: {
          deleteMany: companyIdsToRemove.length > 0 ? { companyId: { in: companyIdsToRemove } } : undefined,
          create: companyIdsToAdd.map((companyId) => ({
            companyId,
          })),
        },
      },
      include: {
        items: {
          select: {
            id: true,
          },
        },
        companies: {
          include: {
            company: true,
          },
        },
      },
    });

    return {
      status: 200,
      data: companyGroup,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification du groupe d\'entreprises');
  }
}

export async function deleteCompanyGroup(dispensarySlug: string, data: { id: string }) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = deleteCompanyGroupSchema.parse(data);

    await prisma.companyGroup.delete({
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
    return actionErrorParser(error, 'Erreur lors de la suppression du groupe d\'entreprises');
  }
}
