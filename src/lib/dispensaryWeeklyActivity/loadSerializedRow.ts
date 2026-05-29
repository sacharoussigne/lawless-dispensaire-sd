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
} from '@/lib/dispensaryWeeklyActivity/fieldVisibility';
import { mergeResolvedDisplayNames } from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';

type RowWithUser = DispensaryWeeklyActivity & { user?: { name: string } | null };

export async function loadSerializedWeeklyActivityById(
  id: string,
): Promise<SerializedDispensaryWeeklyActivityRow | null> {
  const full = await prisma.dispensaryWeeklyActivity.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });
  if (!full) return null;
  const [withName] = await mergeResolvedDisplayNames(prisma, [full as RowWithUser]);
  return serializeDispensaryWeeklyActivityApiRow({
    id: withName.id,
    periodStart: withName.periodStart,
    periodEnd: withName.periodEnd,
    displayName: withName.displayName,
    resolvedDisplayName: withName.resolvedDisplayName,
    discordUserId: withName.discordUserId,
    userId: withName.userId,
    chestDays: withName.chestDays,
    presenceDays: withName.presenceDays,
    sherifCount: withName.sherifCount,
    patientsCount: withName.patientsCount,
    infusionsCount: withName.infusionsCount,
    poppyMilkCount: withName.poppyMilkCount,
    createdAt: withName.createdAt,
    updatedAt: withName.updatedAt,
  });
}

export async function loadSerializedWeeklyActivityByIdForDispensary(
  id: string,
  dispensaryId: string,
): Promise<SerializedDispensaryWeeklyActivityRow | null> {
  const row = await loadSerializedWeeklyActivityById(id);
  if (!row) return null;
  const settings = await getAppSettings(dispensaryId);
  const visibility = weeklyActivityFieldVisibilityFromSettings(settings);
  return redactSerializedWeeklyActivityRow(row, visibility);
}
