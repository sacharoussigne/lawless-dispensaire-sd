'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import {
  appSettingsCacheTag,
  getAppSettings,
  type AppSettingsDTO,
} from '@/lib/appSettings';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';

const updateSchema = z.object({
  dispensaryName: z
    .string()
    .trim()
    .min(1, 'Le nom est requis')
    .max(120, 'Le nom est trop long'),
  featureStockEnabled: z.boolean(),
  featureBankEnabled: z.boolean(),
  featurePrivatePracticeEnabled: z.boolean(),
  featureOrdersEnabled: z.boolean(),
  featureSearchEnabled: z.boolean(),
  featureMailsEnabled: z.boolean(),
  featurePayrollEnabled: z.boolean(),
  featureWeeklyDispensaryActivityEnabled: z.boolean(),
});

export async function getAppSettingsForAdmin(
  dispensarySlug: string,
): Promise<
  | { status: 200; data: AppSettingsDTO }
  | { status: number; error: string }
> {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      permission: {
        resource: 'application',
        action: 'management',
        message: 'Accès réservé aux administrateurs',
      },
    });
    if (!ctx.ok) return ctx.response;

    const data = await getAppSettings(ctx.tenant.dispensaryId);
    return { status: 200, data };
  } catch (error) {
    const parsed = actionErrorParser(
      error,
      'Erreur lors du chargement des paramètres',
    );
    return {
      status: 500,
      error:
        typeof parsed.error === 'string'
          ? parsed.error
          : 'Erreur lors du chargement des paramètres',
    };
  }
}

export async function updateAppSettings(
  dispensarySlug: string,
  input: z.infer<typeof updateSchema>,
): Promise<
  | { status: 200; data: AppSettingsDTO }
  | { status: number; error: string }
> {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      permission: {
        resource: 'application',
        action: 'management',
        message: 'Accès réservé aux administrateurs',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: 400,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      };
    }

    const row = await prisma.appSettings.upsert({
      where: { dispensaryId },
      create: {
        dispensaryId,
        dispensaryName: parsed.data.dispensaryName,
        featureStockEnabled: parsed.data.featureStockEnabled,
        featureBankEnabled: parsed.data.featureBankEnabled,
        featurePrivatePracticeEnabled: parsed.data.featurePrivatePracticeEnabled,
        featureOrdersEnabled: parsed.data.featureOrdersEnabled,
        featureSearchEnabled: parsed.data.featureSearchEnabled,
        featureMailsEnabled: parsed.data.featureMailsEnabled,
        featurePayrollEnabled: parsed.data.featurePayrollEnabled,
        featureWeeklyDispensaryActivityEnabled:
          parsed.data.featureWeeklyDispensaryActivityEnabled,
      },
      update: {
        dispensaryName: parsed.data.dispensaryName,
        featureStockEnabled: parsed.data.featureStockEnabled,
        featureBankEnabled: parsed.data.featureBankEnabled,
        featurePrivatePracticeEnabled: parsed.data.featurePrivatePracticeEnabled,
        featureOrdersEnabled: parsed.data.featureOrdersEnabled,
        featureSearchEnabled: parsed.data.featureSearchEnabled,
        featureMailsEnabled: parsed.data.featureMailsEnabled,
        featurePayrollEnabled: parsed.data.featurePayrollEnabled,
        featureWeeklyDispensaryActivityEnabled:
          parsed.data.featureWeeklyDispensaryActivityEnabled,
      },
    });

    updateTag(appSettingsCacheTag(dispensaryId));

    const data: AppSettingsDTO = {
      dispensaryName: row.dispensaryName,
      featureStockEnabled: row.featureStockEnabled,
      featureBankEnabled: row.featureBankEnabled,
      featurePrivatePracticeEnabled: row.featurePrivatePracticeEnabled,
      featureOrdersEnabled: row.featureOrdersEnabled,
      featureSearchEnabled: row.featureSearchEnabled,
      featureMailsEnabled: row.featureMailsEnabled,
      featurePayrollEnabled: row.featurePayrollEnabled,
      featureWeeklyDispensaryActivityEnabled: row.featureWeeklyDispensaryActivityEnabled,
    };

    return { status: 200, data };
  } catch (error) {
    const parsed = actionErrorParser(
      error,
      'Erreur lors de la mise à jour des paramètres',
    );
    return {
      status: 500,
      error:
        typeof parsed.error === 'string'
          ? parsed.error
          : 'Erreur lors de la mise à jour des paramètres',
    };
  }
}
