'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';

// Schéma de validation pour créer un template de lettre
const createLetterTemplateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  content: z.string().min(1, 'Le contenu est requis'),
});

// Schéma de validation pour modifier un template de lettre
const updateLetterTemplateSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  content: z.string().min(1, 'Le contenu est requis'),
});

// Schéma pour supprimer un template de lettre
const deleteLetterTemplateSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Crée un nouveau template de lettre
 */
export async function createLetterTemplate(data: {
  name: string;
  content: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createLetterTemplateSchema.parse(data);

    const letterTemplate = await prisma.letterTemplate.create({
      data: {
        name: validatedData.name,
        content: validatedData.content,
      },
    });

    return {
      status: 201,
      data: letterTemplate,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du template de lettre');
  }
}

/**
 * Récupère tous les templates de lettres
 */
export async function getLetterTemplates() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const letterTemplates = await prisma.letterTemplate.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      status: 200,
      data: letterTemplates,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des templates de lettres');
  }
}

/**
 * Modifie un template de lettre existant
 */
export async function updateLetterTemplate(data: {
  id: string;
  name: string;
  content: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = updateLetterTemplateSchema.parse(data);

    const letterTemplate = await prisma.letterTemplate.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        content: validatedData.content,
      },
    });

    return {
      status: 200,
      data: letterTemplate,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification du template de lettre');
  }
}

/**
 * Supprime un template de lettre
 */
export async function deleteLetterTemplate(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteLetterTemplateSchema.parse(data);

    await prisma.letterTemplate.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du template de lettre');
  }
}
