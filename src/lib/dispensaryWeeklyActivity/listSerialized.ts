import type { Prisma } from '@prisma/client';
import type { DispensaryWeeklyActivity } from '@prisma/client';
import { getAppSettings } from '@/lib/appSettings';
import prisma from '@/lib/prisma';
import {
  serializeDispensaryWeeklyActivityApiRow,
  type SerializedDispensaryWeeklyActivityRow,
} from '@/lib/dispensaryWeeklyActivity/apiRow';
import {
  redactSerializedWeeklyActivityRow,
  weeklyActivityFieldVisibilityFromSettings,
  type WeeklyActivityFieldVisibility,
} from '@/lib/dispensaryWeeklyActivity/fieldVisibility';
import { mergeResolvedDisplayNames } from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';
import { batchSyncActivityUserIds } from '@/lib/dispensaryWeeklyActivity/service';

type ActivityRowWithResolvedName = DispensaryWeeklyActivity & { resolvedDisplayName: string };

export function serializeActivityRows(
  rows: ActivityRowWithResolvedName[],
  visibility: WeeklyActivityFieldVisibility,
): SerializedDispensaryWeeklyActivityRow[] {
  return rows.map((r) =>
    redactSerializedWeeklyActivityRow(
      serializeDispensaryWeeklyActivityApiRow({
        id: r.id,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        displayName: r.displayName,
        resolvedDisplayName: r.resolvedDisplayName,
        discordUserId: r.discordUserId,
        userId: r.userId,
        chestDays: r.chestDays,
        presenceDays: r.presenceDays,
        sherifCount: r.sherifCount,
        patientsCount: r.patientsCount,
        infusionsCount: r.infusionsCount,
        poppyMilkCount: r.poppyMilkCount,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }),
      visibility,
    ),
  );
}

export async function listSerializedWeeklyActivities(
  where: Prisma.DispensaryWeeklyActivityWhereInput,
  dispensaryId: string,
  orderBy: Prisma.DispensaryWeeklyActivityOrderByWithRelationInput | Prisma.DispensaryWeeklyActivityOrderByWithRelationInput[] = {
    periodStart: 'desc',
  },
): Promise<SerializedDispensaryWeeklyActivityRow[]> {
  const rows = await prisma.dispensaryWeeklyActivity.findMany({ where, orderBy });
  const synced = await batchSyncActivityUserIds(prisma, rows);
  const withNames = await mergeResolvedDisplayNames(prisma, synced);
  const settings = await getAppSettings(dispensaryId);
  const visibility = weeklyActivityFieldVisibilityFromSettings(settings);
  return serializeActivityRows(withNames, visibility);
}
