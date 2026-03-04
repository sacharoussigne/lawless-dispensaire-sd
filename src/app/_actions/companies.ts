'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

// Schéma de validation pour créer une entreprise
const createCompanySchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
});

// Schéma de validation pour modifier une entreprise
const updateCompanySchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
});

// Schéma pour supprimer une entreprise
const deleteCompanySchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Crée une nouvelle entreprise
 */
export async function createCompany(data: {
  name: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

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

/**
 * Récupère toutes les entreprises
 */
export async function getCompanies() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

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

/**
 * Modifie une entreprise existante
 */
export async function updateCompany(data: {
  id: string;
  name: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

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

/**
 * Supprime une entreprise
 */
export async function deleteCompany(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

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

