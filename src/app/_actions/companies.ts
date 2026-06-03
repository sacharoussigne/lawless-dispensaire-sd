'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

const createCompanySchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
});

const updateCompanySchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
});

const deleteCompanySchema = z.object({
  id: z.string().uuid('ID invalide'),
});

export async function createCompany(
  dispensarySlug: string,
  data: {
    name: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = createCompanySchema.parse(data);

    const company = await prisma.company.create({
      data: {
        dispensaryId,
        name: validatedData.name,
      },
      include: {
        companyGroups: {
          select: {
            id: true,
          },
        },
      },
    });

    return {
      status: 201,
      data: company,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de l\'entreprise');
  }
}

export async function getCompanies(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const companies = await prisma.company.findMany({
      where: tenantWhere(dispensaryId),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        companyGroups: {
          select: {
            id: true,
          },
        },
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

export async function updateCompany(
  dispensarySlug: string,
  data: {
    id: string;
    name: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = updateCompanySchema.parse(data);

    const company = await prisma.company.update({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
      data: {
        name: validatedData.name,
      },
      include: {
        companyGroups: {
          select: {
            id: true,
          },
        },
      },
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
