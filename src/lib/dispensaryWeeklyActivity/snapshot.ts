import type { DispensaryWeeklyActivity } from '@prisma/client';
import { parseWeekdayFlagsJson, type WeekdayFlags } from '@/lib/dispensaryWeeklyActivity/weekdayFlags';

export type ActivitySnapshotJson = {
  periodStart: string;
  periodEnd: string;
  displayName: string;
  discordUserId: string;
  userId: string | null;
  chestDays: WeekdayFlags;
  presenceDays: WeekdayFlags;
  sherifCount: number;
  palefrenierCount: number;
  patientsCount: number;
  infusionsCount: number;
  poppyMilkCount: number;
};

export function activityToSnapshot(activity: DispensaryWeeklyActivity): ActivitySnapshotJson {
  return {
    periodStart: activity.periodStart.toISOString(),
    periodEnd: activity.periodEnd.toISOString(),
    displayName: activity.displayName,
    discordUserId: activity.discordUserId,
    userId: activity.userId,
    chestDays: parseWeekdayFlagsJson(activity.chestDays),
    presenceDays: parseWeekdayFlagsJson(activity.presenceDays),
    sherifCount: activity.sherifCount,
    palefrenierCount: activity.palefrenierCount,
    patientsCount: activity.patientsCount,
    infusionsCount: activity.infusionsCount,
    poppyMilkCount: activity.poppyMilkCount,
  };
}
