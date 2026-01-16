'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

// Schéma de validation pour créer une catégorie d'item
const createCategoryItemSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  color: z.string().min(1, 'La couleur est requise').max(7, 'La couleur doit être au format hexadécimal').default('#ffffff'),
});

// Schéma de validation pour modifier une catégorie d'item
const updateCategoryItemSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  color: z.string().min(1, 'La couleur est requise').max(7, 'La couleur doit être au format hexadécimal').default('#ffffff'),
});

// Schéma pour supprimer une catégorie d'item
const deleteCategoryItemSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Crée une nouvelle catégorie d'item
 */
export async function createCategoryItem(data: {
  name: string;
  color?: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createCategoryItemSchema.parse(data);

    const categoryItem = await prisma.categoryItem.create({
      data: {
        name: validatedData.name,
        color: validatedData.color || '#ffffff',
      },
    });

    return {
      status: 201,
      data: categoryItem,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de la catégorie d\'item');
  }
}

/**
 * Récupère toutes les catégories d'items
 */
export async function getCategoryItems() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const categoryItems = await prisma.categoryItem.findMany({
      orderBy: {
        createdAt: 'desc',
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
    return actionErrorParser(error, 'Erreur lors de la récupération des catégories d\'items');
  }
}

/**
 * Modifie une catégorie d'item existante
 */
export async function updateCategoryItem(data: {
  id: string;
  name: string;
  color?: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = updateCategoryItemSchema.parse(data);

    const categoryItem = await prisma.categoryItem.update({
      where: {
        id: validatedData.id,
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
    return actionErrorParser(error, 'Erreur lors de la modification de la catégorie d\'item');
  }
}

/**
 * Supprime une catégorie d'item
 */
export async function deleteCategoryItem(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteCategoryItemSchema.parse(data);

    await prisma.categoryItem.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la catégorie d\'item');
  }
}

