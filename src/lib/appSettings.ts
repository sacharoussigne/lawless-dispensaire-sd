import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import {
  APP_SETTINGS_DEFAULTS,
  APP_FEATURE_DISABLED_MESSAGE,
  appSettingsCacheTag,
  isAppFeatureEnabled,
  type AppFeatureKey,
  type AppSettingsDTO,
} from '@/lib/appSettingsShared';

export type { AppFeatureKey, AppSettingsDTO } from '@/lib/appSettingsShared';
export {
  APP_SETTINGS_DEFAULTS,
  APP_FEATURE_DISABLED_MESSAGE,
  appSettingsCacheTag,
  isAppFeatureEnabled,
  dispensarySiteTitle,
} from '@/lib/appSettingsShared';

function mapFromDb(row: {
  dispensaryName: string;
  featureStockEnabled: boolean;
  featureBankEnabled: boolean;
  featurePrivatePracticeEnabled: boolean;
  featureOrdersEnabled: boolean;
  featureSearchEnabled: boolean;
  featureMailsEnabled: boolean;
  featurePayrollEnabled: boolean;
  featureWeeklyDispensaryActivityEnabled: boolean;
  featureAgendaEnabled: boolean;
  weeklyActivityChestDaysVisible: boolean;
  weeklyActivityPresenceDaysVisible: boolean;
  weeklyActivityPatientsVisible: boolean;
  weeklyActivitySherifsVisible: boolean;
  weeklyActivityInfusionsVisible: boolean;
  weeklyActivityPoppyMilkVisible: boolean;
}): AppSettingsDTO {
  return {
    dispensaryName: row.dispensaryName?.trim() || APP_SETTINGS_DEFAULTS.dispensaryName,
    featureStockEnabled: row.featureStockEnabled,
    featureBankEnabled: row.featureBankEnabled,
    featurePrivatePracticeEnabled: row.featurePrivatePracticeEnabled,
    featureOrdersEnabled: row.featureOrdersEnabled,
    featureSearchEnabled: row.featureSearchEnabled,
    featureMailsEnabled: row.featureMailsEnabled,
    featurePayrollEnabled: row.featurePayrollEnabled,
    featureWeeklyDispensaryActivityEnabled: row.featureWeeklyDispensaryActivityEnabled,
    featureAgendaEnabled: row.featureAgendaEnabled,
    weeklyActivityChestDaysVisible:
      row.weeklyActivityChestDaysVisible ?? APP_SETTINGS_DEFAULTS.weeklyActivityChestDaysVisible,
    weeklyActivityPresenceDaysVisible:
      row.weeklyActivityPresenceDaysVisible ??
      APP_SETTINGS_DEFAULTS.weeklyActivityPresenceDaysVisible,
    weeklyActivityPatientsVisible:
      row.weeklyActivityPatientsVisible ?? APP_SETTINGS_DEFAULTS.weeklyActivityPatientsVisible,
    weeklyActivitySherifsVisible:
      row.weeklyActivitySherifsVisible ?? APP_SETTINGS_DEFAULTS.weeklyActivitySherifsVisible,
    weeklyActivityInfusionsVisible:
      row.weeklyActivityInfusionsVisible ?? APP_SETTINGS_DEFAULTS.weeklyActivityInfusionsVisible,
    weeklyActivityPoppyMilkVisible:
      row.weeklyActivityPoppyMilkVisible ?? APP_SETTINGS_DEFAULTS.weeklyActivityPoppyMilkVisible,
  };
}

export async function loadAppSettingsFromDb(dispensaryId: string): Promise<AppSettingsDTO> {
  try {
    const row = await prisma.appSettings.findUnique({
      where: { dispensaryId },
    });
    if (!row) {
      return { ...APP_SETTINGS_DEFAULTS };
    }
    return mapFromDb(row);
  } catch {
    return { ...APP_SETTINGS_DEFAULTS };
  }
}

export function getAppSettings(dispensaryId: string) {
  return unstable_cache(
    () => loadAppSettingsFromDb(dispensaryId),
    ['app-settings', dispensaryId],
    {
      tags: [appSettingsCacheTag(dispensaryId)],
      revalidate: 86400,
    },
  )();
}

export async function getAppFeatureActionBlock(
  dispensaryId: string,
  feature: AppFeatureKey,
): Promise<{ status: 403; error: string } | null> {
  const settings = await getAppSettings(dispensaryId);
  if (isAppFeatureEnabled(settings, feature)) {
    return null;
  }
  return { status: 403, error: APP_FEATURE_DISABLED_MESSAGE };
}

export async function getAppFeaturesActionBlock(
  dispensaryId: string,
  features: AppFeatureKey[],
): Promise<{ status: 403; error: string } | null> {
  const settings = await getAppSettings(dispensaryId);
  const hasDisabled = features.some((f) => !isAppFeatureEnabled(settings, f));
  if (!hasDisabled) {
    return null;
  }
  return { status: 403, error: APP_FEATURE_DISABLED_MESSAGE };
}
