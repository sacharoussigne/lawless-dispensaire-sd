'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import type { OrderType, OrderStatus } from '@prisma/client';

// Schéma de validation pour créer une assignation
const createAssignmentSchema = z.object({
  orderType: z.enum(['INCOMING', 'OUTGOING']),
  orderStatus: z.enum(['DRAFT', 'LETTER_SENT', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED']),
  letterTemplateId: z.string().uuid('ID de template invalide'),
});

// Schéma de validation pour modifier une assignation
const updateAssignmentSchema = z.object({
  id: z.string().uuid('ID invalide'),
  letterTemplateId: z.string().uuid('ID de template invalide'),
});

// Schéma pour supprimer une assignation
const deleteAssignmentSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Crée une nouvelle assignation de template de lettre
 */
export async function createOrderLetterTemplateAssignment(data: {
  orderType: OrderType;
  orderStatus: OrderStatus;
  letterTemplateId: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = createAssignmentSchema.parse(data);

    // Vérifier que le template existe
    const template = await prisma.letterTemplate.findUnique({
      where: { id: validatedData.letterTemplateId },
    });

    if (!template) {
      return {
        status: 404,
        error: 'Template de lettre introuvable',
      };
    }

    // Vérifier qu'il n'existe pas déjà une assignation pour cette combinaison
    const existing = await prisma.orderLetterTemplateAssignment.findUnique({
      where: {
        orderType_orderStatus: {
          orderType: validatedData.orderType,
          orderStatus: validatedData.orderStatus,
        },
      },
    });

    if (existing) {
      return {
        status: 409,
        error: 'Une assignation existe déjà pour cette combinaison de type et statut',
      };
    }

    const assignment = await prisma.orderLetterTemplateAssignment.create({
      data: {
        orderType: validatedData.orderType,
        orderStatus: validatedData.orderStatus,
        letterTemplateId: validatedData.letterTemplateId,
      },
      include: {
        letterTemplate: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      status: 201,
      data: assignment,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de l\'assignation');
  }
}

/**
 * Récupère toutes les assignations
 */
export async function getOrderLetterTemplateAssignments() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const assignments = await prisma.orderLetterTemplateAssignment.findMany({
      include: {
        letterTemplate: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { orderType: 'asc' },
        { orderStatus: 'asc' },
      ],
    });

    return {
      status: 200,
      data: assignments,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des assignations');
  }
}

/**
 * Récupère une assignation par type et statut
 */
export async function getOrderLetterTemplateAssignmentByTypeAndStatus(data: {
  orderType: OrderType;
  orderStatus: OrderStatus;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const assignment = await prisma.orderLetterTemplateAssignment.findUnique({
      where: {
        orderType_orderStatus: {
          orderType: data.orderType,
          orderStatus: data.orderStatus,
        },
      },
      include: {
        letterTemplate: true,
      },
    });

    return {
      status: 200,
      data: assignment,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération de l\'assignation');
  }
}

/**
 * Modifie une assignation existante
 */
export async function updateOrderLetterTemplateAssignment(data: {
  id: string;
  letterTemplateId: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = updateAssignmentSchema.parse(data);

    // Vérifier que le template existe
    const template = await prisma.letterTemplate.findUnique({
      where: { id: validatedData.letterTemplateId },
    });

    if (!template) {
      return {
        status: 404,
        error: 'Template de lettre introuvable',
      };
    }

    // Vérifier que l'assignation existe
    const existing = await prisma.orderLetterTemplateAssignment.findUnique({
      where: { id: validatedData.id },
    });

    if (!existing) {
      return {
        status: 404,
        error: 'Assignation introuvable',
      };
    }

    const assignment = await prisma.orderLetterTemplateAssignment.update({
      where: {
        id: validatedData.id,
      },
      data: {
        letterTemplateId: validatedData.letterTemplateId,
      },
      include: {
        letterTemplate: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      status: 200,
      data: assignment,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification de l\'assignation');
  }
}

/**
 * Supprime une assignation
 */
export async function deleteOrderLetterTemplateAssignment(data: { id: string }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const validatedData = deleteAssignmentSchema.parse(data);

    await prisma.orderLetterTemplateAssignment.delete({
      where: {
        id: validatedData.id,
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de l\'assignation');
  }
}
