export const APP_SETTINGS_CACHE_TAG = 'app-settings';

export type AppFeatureKey =
  | 'stock'
  | 'bank'
  | 'privatePractice'
  | 'orders'
  | 'search'
  | 'mails';

export type AppSettingsDTO = {
  dispensaryName: string;
  featureStockEnabled: boolean;
  featureBankEnabled: boolean;
  featurePrivatePracticeEnabled: boolean;
  featureOrdersEnabled: boolean;
  featureSearchEnabled: boolean;
  featureMailsEnabled: boolean;
};

export const APP_SETTINGS_DEFAULTS: AppSettingsDTO = {
  dispensaryName: 'Saint-Denis',
  featureStockEnabled: true,
  featureBankEnabled: true,
  featurePrivatePracticeEnabled: true,
  featureOrdersEnabled: true,
  featureSearchEnabled: true,
  featureMailsEnabled: true,
};

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
    default: {
      const _exhaustive: never = feature;
      return _exhaustive;
    }
  }
}

export const APP_FEATURE_DISABLED_MESSAGE =
  'Cette fonctionnalité est désactivée.';

export function dispensarySiteTitle(settings: AppSettingsDTO): string {
  const name =
    settings.dispensaryName.trim() || APP_SETTINGS_DEFAULTS.dispensaryName;
  return `Dispensaire ${name}`;
}
