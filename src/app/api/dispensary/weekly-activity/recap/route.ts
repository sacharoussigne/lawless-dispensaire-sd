import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isDispensaryBotApiAuthorized, getDiscordUserIdFromBotRequest } from '@/lib/dispensaryWeeklyActivityApiAuth';
import prisma from '@/lib/prisma';
import { getAppSettings } from '@/lib/appSettings';
import { serializeDispensaryWeeklyActivityApiRow } from '@/lib/dispensaryWeeklyActivity/apiRow';
import {
  redactSerializedWeeklyActivityRow,
  weeklyActivityFieldVisibilityFromSettings,
} from '@/lib/dispensaryWeeklyActivity/fieldVisibility';
import { mergeResolvedDisplayNames } from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';
import { syncActivityUserIdFromDiscordIfMissing } from '@/lib/dispensaryWeeklyActivity/service';
import { getBankWeekBounds } from '@/lib/bankWeek';
import { resolveBotDispensaryContext } from '@/lib/dispensaryWeeklyActivity/botRequestContext';
import dayjs from '@/lib/dayjs';

function jsonError(status: number, error: string) {
  return NextResponse.json({ status, error }, { status });
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  if (!isDispensaryBotApiAuthorized(request)) {
    return jsonError(401, 'Non autorisé');
  }

  const dispensaryCtx = await resolveBotDispensaryContext(request);
  if (!dispensaryCtx.ok) {
    return jsonError(dispensaryCtx.status, dispensaryCtx.error);
  }

  const dateParam = request.nextUrl.searchParams.get('date')?.trim() ?? '';
  if (!YMD.test(dateParam)) {
    return jsonError(400, 'Paramètre date requis (YYYY-MM-DD, calendrier Europe/Paris)');
  }

  const anchorParis = dayjs.tz(dateParam, 'YYYY-MM-DD', 'Europe/Paris').startOf('day');
  if (!anchorParis.isValid()) {
    return jsonError(400, 'Date invalide');
  }

  const { start: periodStart, end: periodEnd } = getBankWeekBounds(anchorParis.toDate());
  const optionalDiscord = getDiscordUserIdFromBotRequest(request);

  const overlapWhere = {
    dispensaryId: dispensaryCtx.dispensaryId,
    periodStart: { lte: periodEnd },
    periodEnd: { gte: periodStart },
    ...(optionalDiscord ? { discordUserId: optionalDiscord } : {}),
  };

  const initial = await prisma.dispensaryWeeklyActivity.findMany({
    where: overlapWhere,
    include: { user: { select: { name: true } } },
    orderBy: [{ displayName: 'asc' }, { discordUserId: 'asc' }],
  });

  for (const r of initial) {
    if (!r.userId) {
      await syncActivityUserIdFromDiscordIfMissing(prisma, r);
    }
  }

  const refreshed = await prisma.dispensaryWeeklyActivity.findMany({
    where: overlapWhere,
    include: { user: { select: { name: true } } },
    orderBy: [{ displayName: 'asc' }, { discordUserId: 'asc' }],
  });

  const withNames = await mergeResolvedDisplayNames(prisma, refreshed);
  const sorted = [...withNames].sort((a, b) =>
    a.resolvedDisplayName.localeCompare(b.resolvedDisplayName, 'fr', { sensitivity: 'base' }),
  );
  const settings = await getAppSettings(dispensaryCtx.dispensaryId);
  const visibility = weeklyActivityFieldVisibilityFromSettings(settings);

  return NextResponse.json({
    status: 200,
    data: {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      rows: sorted.map((r) => {
        return redactSerializedWeeklyActivityRow(
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
        );
      }),
    },
  });
}
