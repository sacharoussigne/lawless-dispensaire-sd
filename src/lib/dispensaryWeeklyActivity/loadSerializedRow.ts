import type { DispensaryWeeklyActivity } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  serializeDispensaryWeeklyActivityApiRow,
  type SerializedDispensaryWeeklyActivityRow,
} from '@/lib/dispensaryWeeklyActivity/apiRow';
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
