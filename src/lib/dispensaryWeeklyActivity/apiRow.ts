import type { WeekdayFlags } from '@/lib/dispensaryWeeklyActivity/weekdayFlags';
import {
  countWeekdayTrues,
  formatWeekdayFlagsSummary,
  parseWeekdayFlagsJson,
} from '@/lib/dispensaryWeeklyActivity/weekdayFlags';

type RowLike = {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  displayName: string;
  resolvedDisplayName: string;
  discordUserId: string;
  userId: string | null;
  chestDays: unknown;
  presenceDays: unknown;
  sheriffPatientsCount: number;
  patientsCount: number;
  infusionsCount: number;
  poppyMilkCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SerializedDispensaryWeeklyActivityRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  displayName: string;
  resolvedDisplayName: string;
  discordUserId: string;
  userId: string | null;
  chestDays: WeekdayFlags;
  presenceDays: WeekdayFlags;
  chestTotal: number;
  presenceTotal: number;
  chestDaysSummary: string;
  presenceDaysSummary: string;
  sheriffPatientsCount: number;
  patientsCount: number;
  infusionsCount: number;
  poppyMilkCount: number;
  createdAt: string;
  updatedAt: string;
};

export function serializeDispensaryWeeklyActivityApiRow(r: RowLike): SerializedDispensaryWeeklyActivityRow {
  const chestDays = parseWeekdayFlagsJson(r.chestDays);
  const presenceDays = parseWeekdayFlagsJson(r.presenceDays);
  return {
    id: r.id,
    periodStart: r.periodStart.toISOString(),
    periodEnd: r.periodEnd.toISOString(),
    displayName: r.displayName,
    resolvedDisplayName: r.resolvedDisplayName,
    discordUserId: r.discordUserId,
    userId: r.userId,
    chestDays,
    presenceDays,
    chestTotal: countWeekdayTrues(chestDays),
    presenceTotal: countWeekdayTrues(presenceDays),
    chestDaysSummary: formatWeekdayFlagsSummary(chestDays),
    presenceDaysSummary: formatWeekdayFlagsSummary(presenceDays),
    sheriffPatientsCount: r.sheriffPatientsCount,
    patientsCount: r.patientsCount,
    infusionsCount: r.infusionsCount,
    poppyMilkCount: r.poppyMilkCount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
