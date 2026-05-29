import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { DispensaryWeeklyActivity } from '@prisma/client';
import { isDispensaryBotApiAuthorized, getDiscordUserIdFromBotRequest } from '@/lib/dispensaryWeeklyActivityApiAuth';
import { getAppSettings } from '@/lib/appSettings';
import {
  applyVisibilityToUpdateInput,
  botPatchFieldVisibilityError,
  weeklyActivityFieldVisibilityFromSettings,
} from '@/lib/dispensaryWeeklyActivity/fieldVisibility';
import { loadSerializedWeeklyActivityByIdForDispensary } from '@/lib/dispensaryWeeklyActivity/loadSerializedRow';
import prisma from '@/lib/prisma';
import { dispensaryWeeklyActivityBotPatchSchema } from '@/lib/dispensaryWeeklyActivity/schemas';
import {
  deleteDispensaryWeeklyActivityWithHistory,
  syncActivityUserIdFromDiscordIfMissing,
  updateDispensaryWeeklyActivityWithHistory,
} from '@/lib/dispensaryWeeklyActivity/service';
import { resolveBotDispensaryContext } from '@/lib/dispensaryWeeklyActivity/botRequestContext';

function jsonError(status: number, error: string) {
  return NextResponse.json({ status, error }, { status });
}

type RouteContext = { params: Promise<{ id: string }> };

type LoadActivityForBotResult =
  | { error: NextResponse }
  | { activity: DispensaryWeeklyActivity };

async function loadActivityForBot(
  request: NextRequest,
  id: string,
  discordUserId: string,
  dispensaryId: string,
): Promise<LoadActivityForBotResult> {
  const initial = await prisma.dispensaryWeeklyActivity.findFirst({
    where: { id, dispensaryId },
  });

  if (!initial) {
    return { error: jsonError(404, 'Activité introuvable') };
  }

  if (initial.discordUserId !== discordUserId) {
    return { error: jsonError(403, 'Accès refusé') };
  }

  if (!initial.userId) {
    await syncActivityUserIdFromDiscordIfMissing(prisma, initial);
  }

  return { activity: initial };
}

export async function GET(request: NextRequest, context: RouteContext) {
  if (!isDispensaryBotApiAuthorized(request)) {
    return jsonError(401, 'Non autorisé');
  }
  const dispensaryCtx = await resolveBotDispensaryContext(request);
  if (!dispensaryCtx.ok) {
    return jsonError(dispensaryCtx.status, dispensaryCtx.error);
  }
  const discordUserId = getDiscordUserIdFromBotRequest(request);
  if (!discordUserId) {
    return jsonError(400, 'En-tête X-Discord-User-Id requis');
  }

  const { id } = await context.params;
  const loaded = await loadActivityForBot(
    request,
    id,
    discordUserId,
    dispensaryCtx.dispensaryId,
  );
  if ('error' in loaded) {
    return loaded.error;
  }

  const data = await loadSerializedWeeklyActivityByIdForDispensary(
    id,
    dispensaryCtx.dispensaryId,
  );
  if (!data) {
    return jsonError(404, 'Activité introuvable');
  }
  return NextResponse.json({ status: 200, data });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isDispensaryBotApiAuthorized(request)) {
    return jsonError(401, 'Non autorisé');
  }
  const dispensaryCtx = await resolveBotDispensaryContext(request);
  if (!dispensaryCtx.ok) {
    return jsonError(dispensaryCtx.status, dispensaryCtx.error);
  }
  const discordUserId = getDiscordUserIdFromBotRequest(request);
  if (!discordUserId) {
    return jsonError(400, 'En-tête X-Discord-User-Id requis');
  }

  const { id } = await context.params;
  const loaded = await loadActivityForBot(
    request,
    id,
    discordUserId,
    dispensaryCtx.dispensaryId,
  );
  if ('error' in loaded) {
    return loaded.error;
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

  const settings = await getAppSettings(dispensaryCtx.dispensaryId);
  const visibility = weeklyActivityFieldVisibilityFromSettings(settings);
  const fieldError = botPatchFieldVisibilityError(parsed.data, visibility);
  if (fieldError) {
    return jsonError(403, fieldError);
  }
  const updateInput = applyVisibilityToUpdateInput(parsed.data, visibility);

  try {
    await updateDispensaryWeeklyActivityWithHistory(id, updateInput, {
      source: 'DISCORD_BOT',
      actorUserId: null,
      actorDiscordUserId: discordUserId,
      dispensaryId: dispensaryCtx.dispensaryId,
    });

    const data = await loadSerializedWeeklyActivityByIdForDispensary(
      id,
      dispensaryCtx.dispensaryId,
    );
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isDispensaryBotApiAuthorized(request)) {
    return jsonError(401, 'Non autorisé');
  }
  const dispensaryCtx = await resolveBotDispensaryContext(request);
  if (!dispensaryCtx.ok) {
    return jsonError(dispensaryCtx.status, dispensaryCtx.error);
  }
  const discordUserId = getDiscordUserIdFromBotRequest(request);
  if (!discordUserId) {
    return jsonError(400, 'En-tête X-Discord-User-Id requis');
  }

  const { id } = await context.params;
  const loaded = await loadActivityForBot(
    request,
    id,
    discordUserId,
    dispensaryCtx.dispensaryId,
  );
  if ('error' in loaded) {
    return loaded.error;
  }

  try {
    await deleteDispensaryWeeklyActivityWithHistory(id, {
      source: 'DISCORD_BOT',
      actorUserId: null,
      actorDiscordUserId: discordUserId,
      dispensaryId: dispensaryCtx.dispensaryId,
    });
    return NextResponse.json({ status: 200, data: { ok: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur serveur';
    return jsonError(500, msg);
  }
}
