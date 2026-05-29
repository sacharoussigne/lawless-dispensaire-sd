export type AppFeatureKey =
  | 'stock'
  | 'bank'
  | 'privatePractice'
  | 'orders'
  | 'search'
  | 'mails'
  | 'payroll'
  | 'weeklyDispensaryActivity';

export type AppSettingsDTO = {
  dispensaryName: string;
  featureStockEnabled: boolean;
  featureBankEnabled: boolean;
  featurePrivatePracticeEnabled: boolean;
  featureOrdersEnabled: boolean;
  featureSearchEnabled: boolean;
  featureMailsEnabled: boolean;
  featurePayrollEnabled: boolean;
  featureWeeklyDispensaryActivityEnabled: boolean;
};

export const APP_SETTINGS_DEFAULTS: AppSettingsDTO = {
  dispensaryName: 'Saint-Denis',
  featureStockEnabled: true,
  featureBankEnabled: true,
  featurePrivatePracticeEnabled: true,
  featureOrdersEnabled: true,
  featureSearchEnabled: true,
  featureMailsEnabled: true,
  featurePayrollEnabled: true,
  featureWeeklyDispensaryActivityEnabled: true,
};

export function appSettingsCacheTag(dispensaryId: string): string {
  return `app-settings-${dispensaryId}`;
}

export const APP_FEATURE_DISABLED_MESSAGE =
  'Cette fonctionnalité est désactivée pour ce dispensaire.';

export function isAppFeatureEnabled(
  settings: AppSettingsDTO,
  feature: AppFeatureKey,
): boolean {
  switch (feature) {
    case 'stock':
      return settings.featureStockEnabled;
    case 'bank':
      return settings.featureBankEnabled;
    case 'privatePractice':
      return settings.featurePrivatePracticeEnabled;
    case 'orders':
      return settings.featureOrdersEnabled;
    case 'search':
      return settings.featureSearchEnabled;
    case 'mails':
      return settings.featureMailsEnabled;
    case 'payroll':
      return settings.featurePayrollEnabled;
    case 'weeklyDispensaryActivity':
      return settings.featureWeeklyDispensaryActivityEnabled;
    default: {
      const _exhaustive: never = feature;
      return _exhaustive;
    }
  }
}

export function dispensarySiteTitle(settings: AppSettingsDTO): string {
  const name =
    settings.dispensaryName.trim() || APP_SETTINGS_DEFAULTS.dispensaryName;
  return `Dispensaire ${name}`;
}
