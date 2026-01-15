'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

// Schéma de validation pour créer une location
const createLocationSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
});

// Schéma de validation pour modifier une location
const updateLocationSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  description: z.string().max(1000, 'La description est trop longue').optional(),
});

// Schéma pour supprimer une location
const deleteLocationSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Crée une nouvelle location
 */
export async function createLocation(data: {
  name: string;
  description?: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createLocationSchema.parse(data);

    const location = await prisma.location.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
      },
    });

    return {
      status: 201,
      data: location,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de la location');
  }
}

/**
 * Récupère toutes les locations
 */
export async function getLocations() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const locations = await prisma.location.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        companies: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      status: 200,
      data: locations,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des locations');
  }
}

/**
 * Modifie une location existante
 */
export async function updateLocation(data: {
  id: string;
  name: string;
  description?: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = updateLocationSchema.parse(data);

    const location = await prisma.location.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        description: validatedData.description,
      },
    });

    return {
      status: 200,
      data: location,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification de la location');
  }
}

/**
 * Supprime une location
 */
export async function deleteLocation(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteLocationSchema.parse(data);

    await prisma.location.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la location');
  }
}

