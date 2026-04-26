import { NextResponse } from 'next/server';
import { isDispensaryBotApiAuthorized, getDiscordUserIdFromBotRequest } from '@/lib/dispensaryWeeklyActivityApiAuth';
import prisma from '@/lib/prisma';
import { serializeDispensaryWeeklyActivityApiRow } from '@/lib/dispensaryWeeklyActivity/apiRow';
import { mergeResolvedDisplayNames } from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';
import { dispensaryWeeklyActivityCreateSchema } from '@/lib/dispensaryWeeklyActivity/schemas';
import { loadSerializedWeeklyActivityById } from '@/lib/dispensaryWeeklyActivity/loadSerializedRow';
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
    data: withNames.map((r) =>
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
        palefrenierCount: r.palefrenierCount,
        patientsCount: r.patientsCount,
        infusionsCount: r.infusionsCount,
        poppyMilkCount: r.poppyMilkCount,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }),
    ),
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

    const data = await loadSerializedWeeklyActivityById(created.id);
    if (!data) {
      return jsonError(500, 'Erreur après création');
    }

    return NextResponse.json({
      status: 200,
      data,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur serveur';
    if (msg.includes('Unique constraint')) {
      return jsonError(409, 'Une entrée existe déjà pour cette période et ce médecin');
    }
    return jsonError(500, msg);
  }
}
