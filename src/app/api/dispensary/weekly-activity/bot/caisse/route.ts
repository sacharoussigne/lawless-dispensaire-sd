import { NextResponse } from 'next/server';
import { isDispensaryBotApiAuthorized, getDiscordUserIdFromBotRequest } from '@/lib/dispensaryWeeklyActivityApiAuth';
import { loadSerializedWeeklyActivityById } from '@/lib/dispensaryWeeklyActivity/loadSerializedRow';
import { dispensaryWeeklyActivityBotCaisseBodySchema } from '@/lib/dispensaryWeeklyActivity/schemas';
import { botMarkChestForParisToday } from '@/lib/dispensaryWeeklyActivity/service';

function jsonError(status: number, error: string) {
  return NextResponse.json({ status, error }, { status });
}

export async function POST(request: Request) {
  if (!isDispensaryBotApiAuthorized(request as Parameters<typeof isDispensaryBotApiAuthorized>[0])) {
    return jsonError(401, 'Non autorisé');
  }
  const discordUserId = getDiscordUserIdFromBotRequest(request as Parameters<typeof getDiscordUserIdFromBotRequest>[0]);
  if (!discordUserId) {
    return jsonError(400, 'En-tête X-Discord-User-Id requis');
  }

  const text = await request.text();
  let body: unknown = {};
  if (text.trim() !== '') {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      return jsonError(400, 'Corps JSON invalide');
    }
  }

  const parsed = dispensaryWeeklyActivityBotCaisseBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, parsed.error.issues[0]?.message ?? 'Données invalides');
  }

  try {
    const result = await botMarkChestForParisToday(discordUserId, {
      displayName: parsed.data.displayName,
    });
    if (result.outcome === 'already_done') {
      return NextResponse.json({
        status: 200,
        data: { alreadyDone: true, message: result.message },
      });
    }
    const serialized = await loadSerializedWeeklyActivityById(result.activity.id);
    if (!serialized) {
      return jsonError(500, 'Erreur après mise à jour');
    }
    return NextResponse.json({
      status: 200,
      data: { alreadyDone: false, activity: serialized },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur serveur';
    return jsonError(500, msg);
  }
}
