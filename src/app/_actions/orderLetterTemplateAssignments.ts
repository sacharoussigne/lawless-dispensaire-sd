'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import type { OrderType, OrderStatus } from '@prisma/client';

const createAssignmentSchema = z.object({
  orderType: z.enum(['INCOMING', 'OUTGOING']),
  orderStatus: z.enum(['DRAFT', 'LETTER_SENT', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED']),
  mailTemplateId: z.string().uuid('ID de template invalide'),
});

const updateAssignmentSchema = z.object({
  id: z.string().uuid('ID invalide'),
  mailTemplateId: z.string().uuid('ID de template invalide'),
});

const deleteAssignmentSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

export async function createOrderLetterTemplateAssignment(
  dispensarySlug: string,
  data: {
    orderType: OrderType;
    orderStatus: OrderStatus;
    mailTemplateId: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = createAssignmentSchema.parse(data);

    const template = await prisma.mailTemplate.findFirst({
      where: {
        id: validatedData.mailTemplateId,
        ...tenantWhere(dispensaryId),
      },
    });

    if (!template) {
      return {
        status: 404,
        error: 'Modèle de courrier introuvable',
      };
    }

    const existing = await prisma.orderMailTemplateAssignment.findUnique({
      where: {
        dispensaryId_orderType_orderStatus: {
          dispensaryId,
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

    const assignment = await prisma.orderMailTemplateAssignment.create({
      data: {
        dispensaryId,
        orderType: validatedData.orderType,
        orderStatus: validatedData.orderStatus,
        mailTemplateId: validatedData.mailTemplateId,
      },
      include: {
        mailTemplate: {
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

export async function getOrderLetterTemplateAssignments(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const assignments = await prisma.orderMailTemplateAssignment.findMany({
      where: tenantWhere(dispensaryId),
      include: {
        mailTemplate: {
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

export async function getOrderLetterTemplateAssignmentByTypeAndStatus(
  dispensarySlug: string,
  data: {
    orderType: OrderType;
    orderStatus: OrderStatus;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const assignment = await prisma.orderMailTemplateAssignment.findUnique({
      where: {
        dispensaryId_orderType_orderStatus: {
          dispensaryId,
          orderType: data.orderType,
          orderStatus: data.orderStatus,
        },
      },
      include: {
        mailTemplate: true,
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

export async function updateOrderLetterTemplateAssignment(
  dispensarySlug: string,
  data: {
    id: string;
    mailTemplateId: string;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = updateAssignmentSchema.parse(data);

    const template = await prisma.mailTemplate.findFirst({
      where: {
        id: validatedData.mailTemplateId,
        ...tenantWhere(dispensaryId),
      },
    });

    if (!template) {
      return {
        status: 404,
        error: 'Modèle de courrier introuvable',
      };
    }

    const existing = await prisma.orderMailTemplateAssignment.findFirst({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
    });

    if (!existing) {
      return {
        status: 404,
        error: 'Assignation introuvable',
      };
    }

    const assignment = await prisma.orderMailTemplateAssignment.update({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
      data: {
        mailTemplateId: validatedData.mailTemplateId,
      },
      include: {
        mailTemplate: {
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

export async function deleteOrderLetterTemplateAssignment(
  dispensarySlug: string,
  data: { id: string },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = deleteAssignmentSchema.parse(data);

    await prisma.orderMailTemplateAssignment.delete({
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
    return actionErrorParser(error, 'Erreur lors de la suppression de l\'assignation');
  }
}
