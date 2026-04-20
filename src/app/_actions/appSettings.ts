'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { hasRole } from '@/lib/auth/permissions';
import {
  APP_SETTINGS_CACHE_TAG,
  getAppSettings,
  type AppSettingsDTO,
} from '@/lib/appSettings';
import { Role } from '@/types/enum/roles';

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

export async function getAppSettingsForAdmin(): Promise<
  | { status: 200; data: AppSettingsDTO }
  | { status: 401 | 403 | 500; error: string }
> {
  try {
    const session = await getAuthSession();
    if (!session) {
      return { status: 401, error: 'Non autorisé' };
    }
    if (!hasRole(session.user?.role, Role.ADMIN)) {
      return { status: 403, error: 'Accès réservé aux administrateurs' };
    }
    const data = await getAppSettings();
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
  input: z.infer<typeof updateSchema>,
): Promise<
  | { status: 200; data: AppSettingsDTO }
  | { status: 400 | 401 | 403 | 500; error: string }
> {
  try {
    const session = await getAuthSession();
    if (!session) {
      return { status: 401, error: 'Non autorisé' };
    }
    if (!hasRole(session.user?.role, Role.ADMIN)) {
      return { status: 403, error: 'Accès réservé aux administrateurs' };
    }

    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: 400,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      };
    }

    const row = await prisma.appSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
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

    updateTag(APP_SETTINGS_CACHE_TAG);

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
