import type { DispensaryWeeklyActivity } from '@prisma/client';

export type ActivitySnapshotJson = {
  periodStart: string;
  periodEnd: string;
  displayName: string;
  discordUserId: string;
  userId: string | null;
  chestCount: number;
  sheriffPatientsCount: number;
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
    chestCount: activity.chestCount,
    sheriffPatientsCount: activity.sheriffPatientsCount,
    patientsCount: activity.patientsCount,
    infusionsCount: activity.infusionsCount,
    poppyMilkCount: activity.poppyMilkCount,
  };
}
