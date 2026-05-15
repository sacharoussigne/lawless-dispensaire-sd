import { isDispensaryBotApiAuthorized, getDiscordUserIdFromBotRequest } from '@/lib/dispensaryWeeklyActivityApiAuth';
import {
  botEditWeekdayFlag,
  isPresenceEditBody,
  jsonBotError,
  mapBotRouteError,
  respondToBotWeekdayFlagResult,
} from '@/lib/dispensaryWeeklyActivity/botRouteHandlers';
import { dispensaryWeeklyActivityBotPresenceBodySchema } from '@/lib/dispensaryWeeklyActivity/schemas';
import { botMarkPresenceForParisRelativeDay } from '@/lib/dispensaryWeeklyActivity/service';

export async function POST(request: Request) {
  if (!isDispensaryBotApiAuthorized(request as Parameters<typeof isDispensaryBotApiAuthorized>[0])) {
    return jsonBotError(401, 'Non autorisé');
  }
  const discordUserId = getDiscordUserIdFromBotRequest(request as Parameters<typeof getDiscordUserIdFromBotRequest>[0]);
  if (!discordUserId) {
    return jsonBotError(400, 'En-tête X-Discord-User-Id requis');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonBotError(400, 'Corps JSON invalide');
  }

  const parsed = dispensaryWeeklyActivityBotPresenceBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonBotError(422, parsed.error.issues[0]?.message ?? 'Données invalides');
  }

  try {
    if (isPresenceEditBody(parsed.data)) {
      const result = await botEditWeekdayFlag(discordUserId, 'presence', parsed.data);
      return respondToBotWeekdayFlagResult(result);
    }

    const relative = parsed.data.day ?? 'today';
    const result = await botMarkPresenceForParisRelativeDay(discordUserId, relative, {
      displayName: parsed.data.displayName,
    });
    return respondToBotWeekdayFlagResult(result);
  } catch (e) {
    const mapped = mapBotRouteError(e);
    if (mapped) return mapped;
    const msg = e instanceof Error ? e.message : 'Erreur serveur';
    return jsonBotError(500, msg);
  }
}
