import { NextResponse } from 'next/server';
import { isDispensaryBotApiAuthorized, getDiscordUserIdFromBotRequest } from '@/lib/dispensaryWeeklyActivityApiAuth';
import { loadSerializedWeeklyActivityById } from '@/lib/dispensaryWeeklyActivity/loadSerializedRow';
import prisma from '@/lib/prisma';
import { dispensaryWeeklyActivityBotPatchSchema } from '@/lib/dispensaryWeeklyActivity/schemas';
import {
  deleteDispensaryWeeklyActivityWithHistory,
  syncActivityUserIdFromDiscordIfMissing,
  updateDispensaryWeeklyActivityWithHistory,
} from '@/lib/dispensaryWeeklyActivity/service';

function jsonError(status: number, error: string) {
  return NextResponse.json({ status, error }, { status });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!isDispensaryBotApiAuthorized(request as Parameters<typeof isDispensaryBotApiAuthorized>[0])) {
    return jsonError(401, 'Non autorisé');
  }
  const discordUserId = getDiscordUserIdFromBotRequest(request as Parameters<typeof getDiscordUserIdFromBotRequest>[0]);
  if (!discordUserId) {
    return jsonError(400, 'En-tête X-Discord-User-Id requis');
  }

  const { id } = await context.params;

  const initial = await prisma.dispensaryWeeklyActivity.findUnique({
    where: { id },
  });

  if (!initial) {
    return jsonError(404, 'Activité introuvable');
  }

  if (initial.discordUserId !== discordUserId) {
    return jsonError(403, 'Accès refusé');
  }

  if (!initial.userId) {
    await syncActivityUserIdFromDiscordIfMissing(prisma, initial);
  }

  const data = await loadSerializedWeeklyActivityById(id);
  if (!data) {
    return jsonError(404, 'Activité introuvable');
  }
  return NextResponse.json({ status: 200, data });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isDispensaryBotApiAuthorized(request as Parameters<typeof isDispensaryBotApiAuthorized>[0])) {
    return jsonError(401, 'Non autorisé');
  }
  const discordUserId = getDiscordUserIdFromBotRequest(request as Parameters<typeof getDiscordUserIdFromBotRequest>[0]);
  if (!discordUserId) {
    return jsonError(400, 'En-tête X-Discord-User-Id requis');
  }

  const { id } = await context.params;

  const existing = await prisma.dispensaryWeeklyActivity.findUnique({ where: { id } });
  if (!existing) {
    return jsonError(404, 'Activité introuvable');
  }
  if (existing.discordUserId !== discordUserId) {
    return jsonError(403, 'Accès refusé');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Corps JSON invalide');
  }

  const parsed = dispensaryWeeklyActivityBotPatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, parsed.error.issues[0]?.message ?? 'Données invalides');
  }

  try {
    await updateDispensaryWeeklyActivityWithHistory(id, parsed.data, {
      source: 'DISCORD_BOT',
      actorUserId: null,
      actorDiscordUserId: discordUserId,
    });

    const data = await loadSerializedWeeklyActivityById(id);
    if (!data) {
      return jsonError(500, 'Erreur après mise à jour');
    }
    return NextResponse.json({ status: 200, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur serveur';
    if (msg.includes('Unique constraint')) {
      return jsonError(409, 'Conflit de période');
    }
    return jsonError(500, msg);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isDispensaryBotApiAuthorized(request as Parameters<typeof isDispensaryBotApiAuthorized>[0])) {
    return jsonError(401, 'Non autorisé');
  }
  const discordUserId = getDiscordUserIdFromBotRequest(request as Parameters<typeof getDiscordUserIdFromBotRequest>[0]);
  if (!discordUserId) {
    return jsonError(400, 'En-tête X-Discord-User-Id requis');
  }

  const { id } = await context.params;

  const existing = await prisma.dispensaryWeeklyActivity.findUnique({ where: { id } });
  if (!existing) {
    return jsonError(404, 'Activité introuvable');
  }
  if (existing.discordUserId !== discordUserId) {
    return jsonError(403, 'Accès refusé');
  }

  try {
    await deleteDispensaryWeeklyActivityWithHistory(id, {
      source: 'DISCORD_BOT',
      actorUserId: null,
      actorDiscordUserId: discordUserId,
    });
    return NextResponse.json({ status: 200, data: { ok: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur serveur';
    return jsonError(500, msg);
  }
}
