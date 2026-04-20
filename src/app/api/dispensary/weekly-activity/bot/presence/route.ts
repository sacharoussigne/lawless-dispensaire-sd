import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isDispensaryBotApiAuthorized, getDiscordUserIdFromBotRequest } from '@/lib/dispensaryWeeklyActivityApiAuth';
import { loadSerializedWeeklyActivityById } from '@/lib/dispensaryWeeklyActivity/loadSerializedRow';
import { botMarkPresenceForParisRelativeDay } from '@/lib/dispensaryWeeklyActivity/service';

function jsonError(status: number, error: string) {
  return NextResponse.json({ status, error }, { status });
}

const bodySchema = z.object({
  day: z.enum(['today', 'yesterday']),
});

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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, parsed.error.issues[0]?.message ?? 'Données invalides');
  }

  try {
    const result = await botMarkPresenceForParisRelativeDay(discordUserId, parsed.data.day);
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
