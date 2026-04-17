'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireSession } from '@/lib/serverActionAuth';

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

export async function createCompany(data: {
  name: string;
}) {
  try {
    const ctx = await requireSession();
    if (!ctx.ok) return ctx.response;

    const validatedData = createCompanySchema.parse(data);

    const company = await prisma.company.create({
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
      status: 201,
      data: company,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de l\'entreprise');
  }
}

export async function getCompanies() {
  try {
    const ctx = await requireSession();
    if (!ctx.ok) return ctx.response;

    const companies = await prisma.company.findMany({
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

export async function updateCompany(data: {
  id: string;
  name: string;
}) {
  try {
    const ctx = await requireSession();
    if (!ctx.ok) return ctx.response;

    const validatedData = updateCompanySchema.parse(data);

    const company = await prisma.company.update({
      where: {
        id: validatedData.id,
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

export async function deleteCompany(data: { id: string }) {
  try {
    const ctx = await requireSession();
    if (!ctx.ok) return ctx.response;

    const validatedData = deleteCompanySchema.parse(data);

    await prisma.company.delete({
      where: {
        id: validatedData.id,
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

