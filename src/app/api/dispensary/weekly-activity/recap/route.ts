import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isDispensaryBotApiAuthorized, getDiscordUserIdFromBotRequest } from '@/lib/dispensaryWeeklyActivityApiAuth';
import prisma from '@/lib/prisma';
import { mergeResolvedDisplayNames } from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';
import { syncActivityUserIdFromDiscordIfMissing } from '@/lib/dispensaryWeeklyActivity/service';
import { getUtcIsoWeekRange, utcMidnightFromYmd } from '@/lib/dispensaryWeeklyActivity/utcIsoWeek';

function jsonError(status: number, error: string) {
  return NextResponse.json({ status, error }, { status });
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  if (!isDispensaryBotApiAuthorized(request)) {
    return jsonError(401, 'Non autorisé');
  }

  const dateParam = request.nextUrl.searchParams.get('date')?.trim() ?? '';
  if (!YMD.test(dateParam)) {
    return jsonError(400, 'Paramètre date requis (YYYY-MM-DD, calendrier UTC)');
  }

  let anchor: Date;
  try {
    anchor = utcMidnightFromYmd(dateParam);
    if (Number.isNaN(anchor.getTime())) {
      return jsonError(400, 'Date invalide');
    }
  } catch {
    return jsonError(400, 'Date invalide');
  }

  const { periodStart, periodEnd } = getUtcIsoWeekRange(anchor);
  const optionalDiscord = getDiscordUserIdFromBotRequest(request);

  const initial = await prisma.dispensaryWeeklyActivity.findMany({
    where: {
      periodStart,
      ...(optionalDiscord ? { discordUserId: optionalDiscord } : {}),
    },
    include: { user: { select: { name: true } } },
    orderBy: [{ displayName: 'asc' }, { discordUserId: 'asc' }],
  });

  for (const r of initial) {
    if (!r.userId) {
      await syncActivityUserIdFromDiscordIfMissing(prisma, r);
    }
  }

  const refreshed = await prisma.dispensaryWeeklyActivity.findMany({
    where: {
      periodStart,
      ...(optionalDiscord ? { discordUserId: optionalDiscord } : {}),
    },
    include: { user: { select: { name: true } } },
    orderBy: [{ displayName: 'asc' }, { discordUserId: 'asc' }],
  });

  const withNames = await mergeResolvedDisplayNames(prisma, refreshed);
  const sorted = [...withNames].sort((a, b) =>
    a.resolvedDisplayName.localeCompare(b.resolvedDisplayName, 'fr', { sensitivity: 'base' }),
  );

  return NextResponse.json({
    status: 200,
    data: {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      rows: sorted.map((r) => ({
        id: r.id,
        periodStart: r.periodStart.toISOString(),
        periodEnd: r.periodEnd.toISOString(),
        displayName: r.displayName,
        resolvedDisplayName: r.resolvedDisplayName,
        discordUserId: r.discordUserId,
        userId: r.userId,
        chestCount: r.chestCount,
        sheriffPatientsCount: r.sheriffPatientsCount,
        patientsCount: r.patientsCount,
        infusionsCount: r.infusionsCount,
        poppyMilkCount: r.poppyMilkCount,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    },
  });
}
