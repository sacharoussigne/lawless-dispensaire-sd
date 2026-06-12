import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isDispensaryBotApiAuthorized, getDiscordUserIdFromBotRequest } from '@/lib/dispensaryWeeklyActivityApiAuth';
import { listSerializedWeeklyActivities } from '@/lib/dispensaryWeeklyActivity/listSerialized';
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

  const rows = await listSerializedWeeklyActivities(
    overlapWhere,
    dispensaryCtx.dispensaryId,
    [{ displayName: 'asc' }, { discordUserId: 'asc' }],
  );

  const sorted = [...rows].sort((a, b) =>
    a.resolvedDisplayName.localeCompare(b.resolvedDisplayName, 'fr', { sensitivity: 'base' }),
  );

  return NextResponse.json({
    status: 200,
    data: {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      rows: sorted,
    },
  });
}
