import { APP_SETTINGS_DEFAULTS, type AppSettingsDTO } from '@/lib/appSettingsShared';
import type { SerializedDispensaryWeeklyActivityRow } from '@/lib/dispensaryWeeklyActivity/apiRow';
import type {
  DispensaryWeeklyActivityCreateInput,
  DispensaryWeeklyActivityUpdateInput,
} from '@/lib/dispensaryWeeklyActivity/schemas';
import {
  emptyWeekdayFlags,
  formatWeekdayFlagsSummary,
} from '@/lib/dispensaryWeeklyActivity/weekdayFlags';

export type WeeklyActivityFieldVisibility = {
  chestDays: boolean;
  presenceDays: boolean;
  patientsCount: boolean;
  sherifCount: boolean;
  infusionsCount: boolean;
  poppyMilkCount: boolean;
};

export function weeklyActivityFieldVisibilityFromSettings(
  settings: AppSettingsDTO,
): WeeklyActivityFieldVisibility {
  const d = APP_SETTINGS_DEFAULTS;
  return {
    chestDays: settings.weeklyActivityChestDaysVisible ?? d.weeklyActivityChestDaysVisible,
    presenceDays: settings.weeklyActivityPresenceDaysVisible ?? d.weeklyActivityPresenceDaysVisible,
    patientsCount: settings.weeklyActivityPatientsVisible ?? d.weeklyActivityPatientsVisible,
    sherifCount: settings.weeklyActivitySherifsVisible ?? d.weeklyActivitySherifsVisible,
    infusionsCount: settings.weeklyActivityInfusionsVisible ?? d.weeklyActivityInfusionsVisible,
    poppyMilkCount: settings.weeklyActivityPoppyMilkVisible ?? d.weeklyActivityPoppyMilkVisible,
  };
}

export function applyVisibilityToCreateInput(
  input: DispensaryWeeklyActivityCreateInput,
  visibility: WeeklyActivityFieldVisibility,
): DispensaryWeeklyActivityCreateInput {
  return {
    ...input,
    chestDays: visibility.chestDays ? input.chestDays : emptyWeekdayFlags(),
    presenceDays: visibility.presenceDays ? input.presenceDays : emptyWeekdayFlags(),
    sherifCount: visibility.sherifCount ? input.sherifCount : 0,
    patientsCount: visibility.patientsCount ? input.patientsCount : 0,
    infusionsCount: visibility.infusionsCount ? input.infusionsCount : 0,
    poppyMilkCount: visibility.poppyMilkCount ? input.poppyMilkCount : 0,
  };
}

export function applyVisibilityToUpdateInput(
  input: DispensaryWeeklyActivityUpdateInput,
  visibility: WeeklyActivityFieldVisibility,
): DispensaryWeeklyActivityUpdateInput {
  const out: DispensaryWeeklyActivityUpdateInput = { ...input };
  if (!visibility.chestDays) delete out.chestDays;
  if (!visibility.presenceDays) delete out.presenceDays;
  if (!visibility.sherifCount) delete out.sherifCount;
  if (!visibility.patientsCount) delete out.patientsCount;
  if (!visibility.infusionsCount) delete out.infusionsCount;
  if (!visibility.poppyMilkCount) delete out.poppyMilkCount;
  return out;
}

export function redactSerializedWeeklyActivityRow(
  row: SerializedDispensaryWeeklyActivityRow,
  visibility: WeeklyActivityFieldVisibility,
): SerializedDispensaryWeeklyActivityRow {
  const emptyChest = emptyWeekdayFlags();
  const emptyPresence = emptyWeekdayFlags();
  return {
    ...row,
    chestDays: visibility.chestDays ? row.chestDays : emptyChest,
    presenceDays: visibility.presenceDays ? row.presenceDays : emptyPresence,
    chestTotal: visibility.chestDays ? row.chestTotal : 0,
    presenceTotal: visibility.presenceDays ? row.presenceTotal : 0,
    chestDaysSummary: visibility.chestDays
      ? row.chestDaysSummary
      : formatWeekdayFlagsSummary(emptyChest),
    presenceDaysSummary: visibility.presenceDays
      ? row.presenceDaysSummary
      : formatWeekdayFlagsSummary(emptyPresence),
    sherifCount: visibility.sherifCount ? row.sherifCount : 0,
    patientsCount: visibility.patientsCount ? row.patientsCount : 0,
    infusionsCount: visibility.infusionsCount ? row.infusionsCount : 0,
    poppyMilkCount: visibility.poppyMilkCount ? row.poppyMilkCount : 0,
  };
}

const BOT_FIELD_ERROR = 'Ce champ est masqué pour ce dispensaire.';

export function botPatchFieldVisibilityError(
  body: DispensaryWeeklyActivityUpdateInput,
  visibility: WeeklyActivityFieldVisibility,
): string | null {
  if (body.chestDays !== undefined && !visibility.chestDays) return BOT_FIELD_ERROR;
  if (body.presenceDays !== undefined && !visibility.presenceDays) return BOT_FIELD_ERROR;
  if (body.sherifCount !== undefined && !visibility.sherifCount) return BOT_FIELD_ERROR;
  if (body.patientsCount !== undefined && !visibility.patientsCount) return BOT_FIELD_ERROR;
  if (body.infusionsCount !== undefined && !visibility.infusionsCount) return BOT_FIELD_ERROR;
  if (body.poppyMilkCount !== undefined && !visibility.poppyMilkCount) return BOT_FIELD_ERROR;
  return null;
}

export function botWeekdayFieldVisibilityError(
  field: 'chest' | 'presence',
  visibility: WeeklyActivityFieldVisibility,
): string | null {
  if (field === 'chest' && !visibility.chestDays) return BOT_FIELD_ERROR;
  if (field === 'presence' && !visibility.presenceDays) return BOT_FIELD_ERROR;
  return null;
}
