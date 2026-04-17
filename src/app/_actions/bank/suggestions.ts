'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { getAppFeatureActionBlock } from '@/lib/appSettings';


export async function getNameSuggestions() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

    const suggestions = await prisma.transactionNameSuggestion.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return {
      status: 200,
      data: suggestions.map(s => s.value),
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des suggestions de noms');
  }
}

/**
 * Gets description suggestions
 */
export async function getDescriptionSuggestions() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

    const suggestions = await prisma.transactionDescriptionSuggestion.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return {
      status: 200,
      data: suggestions.map(s => s.value),
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des suggestions de descriptions');
  }
}

/**
 * Adds a name suggestion
 */
export async function addNameSuggestion(data: { value: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

    if (!data.value || data.value.trim().length === 0) {
      return {
        status: 400,
        error: 'Le nom ne peut pas être vide',
      };
    }

    const suggestion = await prisma.transactionNameSuggestion.upsert({
      where: { value: data.value.trim() },
      update: {},
      create: { value: data.value.trim() },
    });

    return {
      status: 201,
      data: suggestion.value,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de l\'ajout de la suggestion de nom');
  }
}

/**
 * Adds a description suggestion
 */
export async function addDescriptionSuggestion(data: { value: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

    if (!data.value || data.value.trim().length === 0) {
      return {
        status: 400,
        error: 'La description ne peut pas être vide',
      };
    }

    const suggestion = await prisma.transactionDescriptionSuggestion.upsert({
      where: { value: data.value.trim() },
      update: {},
      create: { value: data.value.trim() },
    });

    return {
      status: 201,
      data: suggestion.value,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de l\'ajout de la suggestion de description');
  }
}

/**
 * Deletes a name suggestion
 */
export async function deleteNameSuggestion(data: { value: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

    if (!data.value || data.value.trim().length === 0) {
      return {
        status: 400,
        error: 'Le nom ne peut pas être vide',
      };
    }

    await prisma.transactionNameSuggestion.delete({
      where: { value: data.value.trim() },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la suggestion de nom');
  }
}

/**
 * Deletes a description suggestion
 */
export async function deleteDescriptionSuggestion(data: { value: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

    if (!data.value || data.value.trim().length === 0) {
      return {
        status: 400,
        error: 'La description ne peut pas être vide',
      };
    }

    await prisma.transactionDescriptionSuggestion.delete({
      where: { value: data.value.trim() },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la suggestion de description');
  }
}
