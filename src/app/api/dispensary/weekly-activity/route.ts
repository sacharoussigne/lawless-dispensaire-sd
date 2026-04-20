import { NextResponse } from 'next/server';
import { isDispensaryBotApiAuthorized, getDiscordUserIdFromBotRequest } from '@/lib/dispensaryWeeklyActivityApiAuth';
import prisma from '@/lib/prisma';
import { mergeResolvedDisplayNames } from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';
import { dispensaryWeeklyActivityCreateSchema } from '@/lib/dispensaryWeeklyActivity/schemas';
import {
  createDispensaryWeeklyActivityWithHistory,
  syncActivityUserIdFromDiscordIfMissing,
} from '@/lib/dispensaryWeeklyActivity/service';

function jsonError(status: number, error: string) {
  return NextResponse.json({ status, error }, { status });
}

export async function GET(request: Request) {
  if (!isDispensaryBotApiAuthorized(request as Parameters<typeof isDispensaryBotApiAuthorized>[0])) {
    return jsonError(401, 'Non autorisé');
  }
  const discordUserId = getDiscordUserIdFromBotRequest(request as Parameters<typeof getDiscordUserIdFromBotRequest>[0]);
  if (!discordUserId) {
    return jsonError(400, 'En-tête X-Discord-User-Id requis');
  }

  const initial = await prisma.dispensaryWeeklyActivity.findMany({
    where: { discordUserId },
    include: { user: { select: { name: true } } },
    orderBy: { periodStart: 'desc' },
  });

  for (const r of initial) {
    if (!r.userId) {
      await syncActivityUserIdFromDiscordIfMissing(prisma, r);
    }
  }

  const refreshed = await prisma.dispensaryWeeklyActivity.findMany({
    where: { discordUserId },
    include: { user: { select: { name: true } } },
    orderBy: { periodStart: 'desc' },
  });

  const withNames = await mergeResolvedDisplayNames(prisma, refreshed);

  return NextResponse.json({
    status: 200,
    data: withNames.map((r) => ({
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
  });
}

export async function POST(request: Request) {
  if (!isDispensaryBotApiAuthorized(request as Parameters<typeof isDispensaryBotApiAuthorized>[0])) {
    return jsonError(401, 'Non autorisé');
  }
  const discordUserId = getDiscordUserIdFromBotRequest(request as Parameters<typeof getDiscordUserIdFromBotRequest>[0]);
  if (!discordUserId) {
    return jsonError(400, 'En-tête X-Discord-User-Id requis');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Corps JSON invalide');
  }

  const parsed = dispensaryWeeklyActivityCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, parsed.error.issues[0]?.message ?? 'Données invalides');
  }

  if (parsed.data.discordUserId !== discordUserId) {
    return jsonError(403, 'Le Discord ID du corps doit correspondre à l’en-tête');
  }

  try {
    const created = await createDispensaryWeeklyActivityWithHistory(parsed.data, {
      source: 'DISCORD_BOT',
      actorUserId: null,
      actorDiscordUserId: discordUserId,
    });

    const full = await prisma.dispensaryWeeklyActivity.findUnique({
      where: { id: created.id },
      include: { user: { select: { name: true } } },
    });
    const [withName] = await mergeResolvedDisplayNames(prisma, full ? [full] : []);
    if (!withName) {
      return jsonError(500, 'Erreur après création');
    }

    return NextResponse.json({
      status: 200,
      data: {
        id: withName.id,
        periodStart: withName.periodStart.toISOString(),
        periodEnd: withName.periodEnd.toISOString(),
        displayName: withName.displayName,
        resolvedDisplayName: withName.resolvedDisplayName,
        discordUserId: withName.discordUserId,
        userId: withName.userId,
        chestCount: withName.chestCount,
        sheriffPatientsCount: withName.sheriffPatientsCount,
        patientsCount: withName.patientsCount,
        infusionsCount: withName.infusionsCount,
        poppyMilkCount: withName.poppyMilkCount,
        createdAt: withName.createdAt.toISOString(),
        updatedAt: withName.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur serveur';
    if (msg.includes('Unique constraint')) {
      return jsonError(409, 'Une entrée existe déjà pour cette période et ce médecin');
    }
    return jsonError(500, msg);
  }
}
