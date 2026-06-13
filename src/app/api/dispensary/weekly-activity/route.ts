import { NextResponse } from 'next/server';
import { isDispensaryBotApiAuthorized, getDiscordUserIdFromBotRequest } from '@/lib/dispensaryWeeklyActivityApiAuth';
import { dispensaryWeeklyActivityCreateSchema } from '@/lib/dispensaryWeeklyActivity/schemas';
import { getAppSettings } from '@/lib/appSettings';
import {
  applyVisibilityToCreateInput,
  weeklyActivityFieldVisibilityFromSettings,
} from '@/lib/dispensaryWeeklyActivity/fieldVisibility';
import { loadSerializedWeeklyActivityByIdForDispensary } from '@/lib/dispensaryWeeklyActivity/loadSerializedRow';
import { listSerializedWeeklyActivities } from '@/lib/dispensaryWeeklyActivity/listSerialized';
import { createDispensaryWeeklyActivityWithHistory } from '@/lib/dispensaryWeeklyActivity/service';
import { resolveBotDispensaryContext } from '@/lib/dispensaryWeeklyActivity/botRequestContext';

function jsonError(status: number, error: string) {
  return NextResponse.json({ status, error }, { status });
}

export async function GET(request: Request) {
  const req = request as Parameters<typeof isDispensaryBotApiAuthorized>[0];
  if (!isDispensaryBotApiAuthorized(req)) {
    return jsonError(401, 'Non autorisé');
  }
  const dispensaryCtx = await resolveBotDispensaryContext(req);
  if (!dispensaryCtx.ok) {
    return jsonError(dispensaryCtx.status, dispensaryCtx.error);
  }
  const discordUserId = getDiscordUserIdFromBotRequest(req);
  if (!discordUserId) {
    return jsonError(400, 'En-tête X-Discord-User-Id requis');
  }

  const data = await listSerializedWeeklyActivities(
    { dispensaryId: dispensaryCtx.dispensaryId, discordUserId },
    dispensaryCtx.dispensaryId,
  );

  return NextResponse.json({ status: 200, data });
}

export async function POST(request: Request) {
  const req = request as Parameters<typeof isDispensaryBotApiAuthorized>[0];
  if (!isDispensaryBotApiAuthorized(req)) {
    return jsonError(401, 'Non autorisé');
  }
  const dispensaryCtx = await resolveBotDispensaryContext(req);
  if (!dispensaryCtx.ok) {
    return jsonError(dispensaryCtx.status, dispensaryCtx.error);
  }
  const discordUserId = getDiscordUserIdFromBotRequest(req);
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
    const settings = await getAppSettings(dispensaryCtx.dispensaryId);
    const visibility = weeklyActivityFieldVisibilityFromSettings(settings);
    const createInput = applyVisibilityToCreateInput(parsed.data, visibility);

    const created = await createDispensaryWeeklyActivityWithHistory(createInput, {
      source: 'DISCORD_BOT',
      actorUserId: null,
      actorDiscordUserId: discordUserId,
      dispensaryId: dispensaryCtx.dispensaryId,
    });

    const data = await loadSerializedWeeklyActivityByIdForDispensary(
      created.id,
      dispensaryCtx.dispensaryId,
    );
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
