'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import { startOfWeek, endOfWeek } from 'date-fns';
import { PatientTypeEnumValues } from '@/types/enum/patientType';

const createPatientSchema = z.object({
  weekId: z.string().uuid('ID de semaine invalide'),
  date: z.string().or(z.date()),
  type: z.enum(PatientTypeEnumValues as [string, ...string[]]),
  identity: z.string().min(1, 'L\'identité est requise'),
  description: z.string().optional(),
  consultationPrice: z.number().min(0, 'Le prix de consultation doit être positif'),
  otherPrice: z.number().min(0, 'Le prix autre doit être positif'),
  amountForCashRegister: z.number().min(0, 'Le montant pour la caisse doit être positif'),
  depositedInCashRegister: z.boolean().default(false),
  retrievedFromCashRegister: z.boolean().default(false),
  order: z.number().int().default(0),
});

const updatePatientSchema = z.object({
  id: z.string().uuid('ID invalide'),
  date: z.string().or(z.date()).optional(),
  type: z.enum(PatientTypeEnumValues as [string, ...string[]]).optional(),
  identity: z.string().min(1, 'L\'identité est requise').optional(),
  description: z.string().optional(),
  consultationPrice: z.number().min(0, 'Le prix de consultation doit être positif').optional(),
  otherPrice: z.number().min(0, 'Le prix autre doit être positif').optional(),
  amountForCashRegister: z.number().min(0, 'Le montant pour la caisse doit être positif').optional(),
  depositedInCashRegister: z.boolean().optional(),
  retrievedFromCashRegister: z.boolean().optional(),
  order: z.number().int().optional(),
});

const deletePatientSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

function getWeekBounds(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return { start, end };
}

export async function getOrCreateWeek(dispensarySlug: string, date: Date) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'privatePractice',
      permission: {
        resource: 'private_practice',
        action: 'access',
        message: 'Accès au cabinet privé refusé',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const { start, end } = getWeekBounds(date);

    let week = await prisma.privatePracticeWeek.findUnique({
      where: {
        dispensaryId_weekStart: {
          dispensaryId,
          weekStart: start,
        },
      },
      include: {
        patients: {
          orderBy: [
            { order: 'asc' },
            { date: 'asc' },
          ],
        },
      },
    });

    if (!week) {
      week = await prisma.privatePracticeWeek.create({
        data: {
          dispensaryId,
          weekStart: start,
          weekEnd: end,
        },
        include: {
          patients: {
            orderBy: [
              { order: 'asc' },
              { date: 'asc' },
            ],
          },
        },
      });
    }

    return {
      status: 200,
      data: {
        ...week,
        patients: week.patients.map((p) => ({
          ...p,
          consultationPrice: Number(p.consultationPrice),
          otherPrice: Number(p.otherPrice),
          amountForCashRegister: Number(p.amountForCashRegister),
        })),
      },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération de la semaine');
  }
}

export async function getWeeks(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'privatePractice',
      permission: {
        resource: 'private_practice',
        action: 'access',
        message: 'Accès au cabinet privé refusé',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const weeks = await prisma.privatePracticeWeek.findMany({
      where: tenantWhere(dispensaryId),
      orderBy: {
        weekStart: 'desc',
      },
      include: {
        patients: true,
      },
    });

    return {
      status: 200,
      data: weeks.map((w) => ({
        ...w,
        patients: w.patients.map((p) => ({
          ...p,
          consultationPrice: Number(p.consultationPrice),
          otherPrice: Number(p.otherPrice),
          amountForCashRegister: Number(p.amountForCashRegister),
        })),
      })),
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des semaines');
  }
}

export async function createPatient(
  dispensarySlug: string,
  data: {
    weekId: string;
    date: Date | string;
    type: string;
    identity: string;
    description?: string;
    consultationPrice: number;
    otherPrice: number;
    amountForCashRegister: number;
    depositedInCashRegister?: boolean;
    retrievedFromCashRegister?: boolean;
    order?: number;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'privatePractice',
      permission: {
        resource: 'private_practice',
        action: 'access',
        message: 'Accès au cabinet privé refusé',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = createPatientSchema.parse(data);

    const week = await prisma.privatePracticeWeek.findFirst({
      where: { id: validatedData.weekId, ...tenantWhere(dispensaryId) },
      select: { id: true },
    });

    if (!week) {
      return {
        status: 404,
        error: 'Semaine introuvable',
      };
    }

    const patient = await prisma.privatePracticePatient.create({
      data: {
        weekId: validatedData.weekId,
        date: validatedData.date instanceof Date ? validatedData.date : new Date(validatedData.date),
        type: validatedData.type,
        identity: validatedData.identity,
        description: validatedData.description,
        consultationPrice: validatedData.consultationPrice,
        otherPrice: validatedData.otherPrice,
        amountForCashRegister: validatedData.amountForCashRegister,
        depositedInCashRegister: validatedData.depositedInCashRegister,
        retrievedFromCashRegister: validatedData.retrievedFromCashRegister,
        order: validatedData.order,
      },
    });

    return {
      status: 201,
      data: {
        ...patient,
        consultationPrice: Number(patient.consultationPrice),
        otherPrice: Number(patient.otherPrice),
        amountForCashRegister: Number(patient.amountForCashRegister),
      },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création du patient');
  }
}

export async function updatePatient(
  dispensarySlug: string,
  data: {
    id: string;
    date?: Date | string;
    type?: string;
    identity?: string;
    description?: string;
    consultationPrice?: number;
    otherPrice?: number;
    amountForCashRegister?: number;
    depositedInCashRegister?: boolean;
    retrievedFromCashRegister?: boolean;
    order?: number;
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'privatePractice',
      permission: {
        resource: 'private_practice',
        action: 'access',
        message: 'Accès au cabinet privé refusé',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = updatePatientSchema.parse(data);

    const existing = await prisma.privatePracticePatient.findFirst({
      where: {
        id: validatedData.id,
        week: tenantWhere(dispensaryId),
      },
      select: { id: true },
    });

    if (!existing) {
      return {
        status: 404,
        error: 'Patient introuvable',
      };
    }

    const updateData: Record<string, unknown> = {};
    if (validatedData.date !== undefined) {
      updateData.date = validatedData.date instanceof Date ? validatedData.date : new Date(validatedData.date);
    }
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.identity !== undefined) updateData.identity = validatedData.identity;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.consultationPrice !== undefined) updateData.consultationPrice = validatedData.consultationPrice;
    if (validatedData.otherPrice !== undefined) updateData.otherPrice = validatedData.otherPrice;
    if (validatedData.amountForCashRegister !== undefined) updateData.amountForCashRegister = validatedData.amountForCashRegister;
    if (validatedData.depositedInCashRegister !== undefined) updateData.depositedInCashRegister = validatedData.depositedInCashRegister;
    if (validatedData.retrievedFromCashRegister !== undefined) updateData.retrievedFromCashRegister = validatedData.retrievedFromCashRegister;
    if (validatedData.order !== undefined) updateData.order = validatedData.order;

    const patient = await prisma.privatePracticePatient.update({
      where: { id: validatedData.id },
      data: updateData,
    });

    return {
      status: 200,
      data: {
        ...patient,
        consultationPrice: Number(patient.consultationPrice),
        otherPrice: Number(patient.otherPrice),
        amountForCashRegister: Number(patient.amountForCashRegister),
      },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour du patient');
  }
}

export async function deletePatient(dispensarySlug: string, data: { id: string }) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'privatePractice',
      permission: {
        resource: 'private_practice',
        action: 'access',
        message: 'Accès au cabinet privé refusé',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = deletePatientSchema.parse(data);

    const existing = await prisma.privatePracticePatient.findFirst({
      where: {
        id: validatedData.id,
        week: tenantWhere(dispensaryId),
      },
      select: { id: true },
    });

    if (!existing) {
      return {
        status: 404,
        error: 'Patient introuvable',
      };
    }

    await prisma.privatePracticePatient.delete({
      where: { id: validatedData.id },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression du patient');
  }
}

export async function getIdentitySuggestions(dispensarySlug: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'privatePractice',
      permission: {
        resource: 'private_practice',
        action: 'access',
        message: 'Accès au cabinet privé refusé',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const suggestions = await prisma.patientIdentitySuggestion.findMany({
      where: tenantWhere(dispensaryId),
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return {
      status: 200,
      data: suggestions.map((s) => s.value),
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des suggestions d\'identité');
  }
}

export async function addIdentitySuggestion(dispensarySlug: string, data: { value: string }) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'privatePractice',
      permission: {
        resource: 'private_practice',
        action: 'access',
        message: 'Accès au cabinet privé refusé',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    if (!data.value || data.value.trim().length === 0) {
      return {
        status: 400,
        error: 'L\'identité ne peut pas être vide',
      };
    }

    const trimmed = data.value.trim();

    const suggestion = await prisma.patientIdentitySuggestion.upsert({
      where: {
        dispensaryId_value: {
          dispensaryId,
          value: trimmed,
        },
      },
      update: {},
      create: { dispensaryId, value: trimmed },
    });

    return {
      status: 201,
      data: suggestion.value,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de l\'ajout de la suggestion d\'identité');
  }
}

export async function deleteIdentitySuggestion(dispensarySlug: string, data: { value: string }) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'privatePractice',
      permission: {
        resource: 'private_practice',
        action: 'access',
        message: 'Accès au cabinet privé refusé',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    if (!data.value || data.value.trim().length === 0) {
      return {
        status: 400,
        error: 'L\'identité ne peut pas être vide',
      };
    }

    const trimmed = data.value.trim();

    const existing = await prisma.patientIdentitySuggestion.findUnique({
      where: {
        dispensaryId_value: {
          dispensaryId,
          value: trimmed,
        },
      },
    });

    if (!existing) {
      return {
        status: 404,
        error: 'Suggestion introuvable',
      };
    }

    await prisma.patientIdentitySuggestion.delete({
      where: {
        dispensaryId_value: {
          dispensaryId,
          value: trimmed,
        },
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la suggestion d\'identité');
  }
}
