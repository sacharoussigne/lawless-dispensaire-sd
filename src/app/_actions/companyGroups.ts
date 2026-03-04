'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

// Schéma de validation pour créer un groupe d'entreprises
const createCompanyGroupSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  companyIds: z.array(z.string().uuid('ID d\'entreprise invalide')).optional(),
});

// Schéma de validation pour modifier un groupe d'entreprises
const updateCompanyGroupSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
  companyIds: z.array(z.string().uuid('ID d\'entreprise invalide')).optional(),
});

// Schéma pour supprimer un groupe d'entreprises
const deleteCompanyGroupSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Crée un nouveau groupe d'entreprises
 */
export async function createCompanyGroup(data: {
  name: string;
  description?: string;
  companyIds?: string[];
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createCompanyGroupSchema.parse(data);

    const companyGroup = await prisma.companyGroup.create({
      data: {
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

/**
 * Récupère tous les groupes d'entreprises
 */
export async function getCompanyGroups() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const companyGroups = await prisma.companyGroup.findMany({
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

/**
 * Modifie un groupe d'entreprises existant
 */
export async function updateCompanyGroup(data: {
  id: string;
  name: string;
  description?: string;
  companyIds?: string[];
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = updateCompanyGroupSchema.parse(data);

    // Récupérer les relations existantes
    const existingCompanyGroup = await prisma.companyGroup.findUnique({
      where: { id: validatedData.id },
      include: {
        companies: {
          select: {
            companyId: true,
          },
        },
      },
    });

    const existingCompanyIds = existingCompanyGroup?.companies.map((c) => c.companyId) || [];
    const newCompanyIds = validatedData.companyIds || [];
    const companyIdsToAdd = newCompanyIds.filter((id) => !existingCompanyIds.includes(id));
    const companyIdsToRemove = existingCompanyIds.filter((id) => !newCompanyIds.includes(id));

    const companyGroup = await prisma.companyGroup.update({
      where: {
        id: validatedData.id,
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

/**
 * Supprime un groupe d'entreprises
 */
export async function deleteCompanyGroup(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteCompanyGroupSchema.parse(data);

    await prisma.companyGroup.delete({
      where: {
        id: validatedData.id,
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

