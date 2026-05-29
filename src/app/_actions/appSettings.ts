'use server';

import { revalidatePath } from 'next/cache';
import { updateTag } from 'next/cache';
import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import {
  appSettingsCacheTag,
  getAppSettings,
  type AppSettingsDTO,
} from '@/lib/appSettings';
import { requireDispensaryAdminContext } from '@/lib/dispensary/serverActionContext';

export type DispensarySettingsAdminDTO = AppSettingsDTO & {
  slug: string;
};

const slugSchema = z
  .string()
  .trim()
  .min(1, 'Le slug est requis')
  .max(80, 'Le slug est trop long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug invalide (lettres minuscules, chiffres et tirets)');

const updateSchema = z.object({
  dispensaryName: z
    .string()
    .trim()
    .min(1, 'Le nom est requis')
    .max(120, 'Le nom est trop long'),
  slug: slugSchema,
  featureStockEnabled: z.boolean(),
  featureBankEnabled: z.boolean(),
  featurePrivatePracticeEnabled: z.boolean(),
  featureOrdersEnabled: z.boolean(),
  featureSearchEnabled: z.boolean(),
  featureMailsEnabled: z.boolean(),
  featurePayrollEnabled: z.boolean(),
  featureWeeklyDispensaryActivityEnabled: z.boolean(),
  weeklyActivityChestDaysVisible: z.boolean(),
  weeklyActivityPresenceDaysVisible: z.boolean(),
  weeklyActivityPatientsVisible: z.boolean(),
  weeklyActivitySherifsVisible: z.boolean(),
  weeklyActivityInfusionsVisible: z.boolean(),
  weeklyActivityPoppyMilkVisible: z.boolean(),
});

export async function getAppSettingsForAdmin(
  dispensarySlug: string,
): Promise<
  | { status: 200; data: DispensarySettingsAdminDTO }
  | { status: number; error: string }
> {
  try {
    const auth = await requireDispensaryAdminContext(dispensarySlug);
    if (!auth.ok) {
      return { status: auth.status, error: auth.error };
    }

    const settings = await getAppSettings(auth.ctx.dispensaryId);
    const data: DispensarySettingsAdminDTO = {
      ...settings,
      slug: auth.ctx.dispensary.slug,
    };
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
  | { status: 200; data: DispensarySettingsAdminDTO }
  | { status: number; error: string }
> {
  try {
    const auth = await requireDispensaryAdminContext(dispensarySlug);
    if (!auth.ok) {
      return { status: auth.status, error: auth.error };
    }
    const { dispensaryId, dispensary } = auth.ctx;

    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: 400,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      };
    }

    const newSlug = parsed.data.slug;
    if (newSlug !== dispensary.slug) {
      const taken = await prisma.dispensary.findFirst({
        where: { slug: newSlug, id: { not: dispensaryId } },
        select: { id: true },
      });
      if (taken) {
        return { status: 409, error: 'Ce slug est déjà utilisé par un autre dispensaire' };
      }
    }

    const [, row] = await prisma.$transaction([
      prisma.dispensary.update({
        where: { id: dispensaryId },
        data: {
          name: parsed.data.dispensaryName,
          slug: newSlug,
        },
      }),
      prisma.appSettings.upsert({
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
          weeklyActivityChestDaysVisible: parsed.data.weeklyActivityChestDaysVisible,
          weeklyActivityPresenceDaysVisible: parsed.data.weeklyActivityPresenceDaysVisible,
          weeklyActivityPatientsVisible: parsed.data.weeklyActivityPatientsVisible,
          weeklyActivitySherifsVisible: parsed.data.weeklyActivitySherifsVisible,
          weeklyActivityInfusionsVisible: parsed.data.weeklyActivityInfusionsVisible,
          weeklyActivityPoppyMilkVisible: parsed.data.weeklyActivityPoppyMilkVisible,
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
          weeklyActivityChestDaysVisible: parsed.data.weeklyActivityChestDaysVisible,
          weeklyActivityPresenceDaysVisible: parsed.data.weeklyActivityPresenceDaysVisible,
          weeklyActivityPatientsVisible: parsed.data.weeklyActivityPatientsVisible,
          weeklyActivitySherifsVisible: parsed.data.weeklyActivitySherifsVisible,
          weeklyActivityInfusionsVisible: parsed.data.weeklyActivityInfusionsVisible,
          weeklyActivityPoppyMilkVisible: parsed.data.weeklyActivityPoppyMilkVisible,
        },
      }),
    ]);

    updateTag(appSettingsCacheTag(dispensaryId));
    revalidatePath(`/d/${dispensary.slug}`, 'layout');
    if (newSlug !== dispensary.slug) {
      revalidatePath(`/d/${newSlug}`, 'layout');
    }
    revalidatePath('/platform/dispensaries');

    const data: DispensarySettingsAdminDTO = {
      dispensaryName: row.dispensaryName,
      slug: newSlug,
      featureStockEnabled: row.featureStockEnabled,
      featureBankEnabled: row.featureBankEnabled,
      featurePrivatePracticeEnabled: row.featurePrivatePracticeEnabled,
      featureOrdersEnabled: row.featureOrdersEnabled,
      featureSearchEnabled: row.featureSearchEnabled,
      featureMailsEnabled: row.featureMailsEnabled,
      featurePayrollEnabled: row.featurePayrollEnabled,
      featureWeeklyDispensaryActivityEnabled: row.featureWeeklyDispensaryActivityEnabled,
      weeklyActivityChestDaysVisible: row.weeklyActivityChestDaysVisible ?? true,
      weeklyActivityPresenceDaysVisible: row.weeklyActivityPresenceDaysVisible ?? true,
      weeklyActivityPatientsVisible: row.weeklyActivityPatientsVisible ?? true,
      weeklyActivitySherifsVisible: row.weeklyActivitySherifsVisible ?? true,
      weeklyActivityInfusionsVisible: row.weeklyActivityInfusionsVisible ?? true,
      weeklyActivityPoppyMilkVisible: row.weeklyActivityPoppyMilkVisible ?? true,
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
