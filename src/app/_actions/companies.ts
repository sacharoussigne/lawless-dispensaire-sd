'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

const companyGroupIdsSchema = z.array(z.string().uuid('ID de groupe invalide')).optional();

const createCompanySchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  companyGroupIds: companyGroupIdsSchema,
});

const updateCompanySchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  companyGroupIds: companyGroupIdsSchema,
});

const deleteCompanySchema = z.object({
  id: z.string().uuid('ID invalide'),
});

const companyManagementInclude = {
  companyGroups: {
    select: {
      companyGroupId: true,
      companyGroup: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  _count: {
    select: {
      companyGroups: true,
      orders: true,
    },
  },
} as const;

async function validateCompanyGroupIds(
  dispensaryId: string,
  companyGroupIds: string[],
): Promise<{ ok: true } | { ok: false; response: { status: number; error: string } }> {
  if (companyGroupIds.length === 0) {
    return { ok: true };
  }

  const companyGroups = await prisma.companyGroup.findMany({
    where: {
      id: { in: companyGroupIds },
      ...tenantWhere(dispensaryId),
    },
    select: { id: true },
  });

  if (companyGroups.length !== companyGroupIds.length) {
    return { ok: false, response: { status: 400, error: 'Un ou plusieurs groupes d\'entreprises sont invalides' } };
  }

  return { ok: true };
}

export async function createCompany(
  dispensarySlug: string,
  data: {
    name: string;
    companyGroupIds?: string[];
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = createCompanySchema.parse(data);

    if (validatedData.companyGroupIds && validatedData.companyGroupIds.length > 0) {
      const groupsResult = await validateCompanyGroupIds(dispensaryId, validatedData.companyGroupIds);
      if (!groupsResult.ok) return groupsResult.response;
    }

    const company = await prisma.company.create({
      data: {
        dispensaryId,
        name: validatedData.name,
        companyGroups: validatedData.companyGroupIds
          ? {
              create: validatedData.companyGroupIds.map((companyGroupId) => ({
                companyGroupId,
              })),
            }
          : undefined,
      },
      include: companyManagementInclude,
    });

    return {
      status: 201,
      data: company,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de l\'entreprise');
  }
}

export async function getCompaniesForSelect(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const companies = await prisma.company.findMany({
      where: tenantWhere(dispensaryId),
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      status: 200,
      data: companies,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des entreprises');
  }
}

export async function getCompanies(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const companies = await prisma.company.findMany({
      where: tenantWhere(dispensaryId),
      include: companyManagementInclude,
    });

    return {
      status: 200,
      data: companies,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des entreprises');
  }
}

export async function updateCompany(
  dispensarySlug: string,
  data: {
    id: string;
    name: string;
    companyGroupIds?: string[];
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = updateCompanySchema.parse(data);

    const existingCompany = await prisma.company.findFirst({
      where: { id: validatedData.id, ...tenantWhere(dispensaryId) },
      include: {
        companyGroups: {
          select: {
            companyGroupId: true,
          },
        },
      },
    });

    if (!existingCompany) {
      return { status: 404, error: 'Entreprise introuvable' };
    }

    const newCompanyGroupIds = validatedData.companyGroupIds ?? [];
    const groupsResult = await validateCompanyGroupIds(dispensaryId, newCompanyGroupIds);
    if (!groupsResult.ok) return groupsResult.response;

    const existingCompanyGroupIds = existingCompany.companyGroups.map((g) => g.companyGroupId);
    const companyGroupIdsToAdd = newCompanyGroupIds.filter(
      (id) => !existingCompanyGroupIds.includes(id),
    );
    const companyGroupIdsToRemove = existingCompanyGroupIds.filter(
      (id) => !newCompanyGroupIds.includes(id),
    );

    const company = await prisma.company.update({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
      data: {
        name: validatedData.name,
        companyGroups: {
          deleteMany:
            companyGroupIdsToRemove.length > 0
              ? { companyGroupId: { in: companyGroupIdsToRemove } }
              : undefined,
          create: companyGroupIdsToAdd.map((companyGroupId) => ({
            companyGroupId,
          })),
        },
      },
      include: companyManagementInclude,
    });

    return {
      status: 200,
      data: company,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification de l\'entreprise');
  }
}

export async function deleteCompany(dispensarySlug: string, data: { id: string }) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = deleteCompanySchema.parse(data);

    await prisma.company.delete({
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
    return actionErrorParser(error, 'Erreur lors de la suppression de l\'entreprise');
  }
}
