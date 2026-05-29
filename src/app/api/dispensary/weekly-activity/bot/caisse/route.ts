import { isDispensaryBotApiAuthorized, getDiscordUserIdFromBotRequest } from '@/lib/dispensaryWeeklyActivityApiAuth';
import {
  botEditWeekdayFlag,
  isCaisseEditBody,
  jsonBotError,
  mapBotRouteError,
  respondToBotWeekdayFlagResult,
} from '@/lib/dispensaryWeeklyActivity/botRouteHandlers';
import { dispensaryWeeklyActivityBotCaisseBodySchema } from '@/lib/dispensaryWeeklyActivity/schemas';
import { botMarkChestForParisToday } from '@/lib/dispensaryWeeklyActivity/service';
import { resolveBotDispensaryContext } from '@/lib/dispensaryWeeklyActivity/botRequestContext';

export async function POST(request: Request) {
  const req = request as Parameters<typeof isDispensaryBotApiAuthorized>[0];
  if (!isDispensaryBotApiAuthorized(req)) {
    return jsonBotError(401, 'Non autorisé');
  }
  const dispensaryCtx = await resolveBotDispensaryContext(req);
  if (!dispensaryCtx.ok) {
    return jsonBotError(dispensaryCtx.status, dispensaryCtx.error);
  }

  const discordUserId = getDiscordUserIdFromBotRequest(req);
  if (!discordUserId) {
    return jsonBotError(400, 'En-tête X-Discord-User-Id requis');
  }

  const text = await request.text();
  let body: unknown = {};
  if (text.trim() !== '') {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      return jsonBotError(400, 'Corps JSON invalide');
    }
  }

  const parsed = dispensaryWeeklyActivityBotCaisseBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonBotError(422, parsed.error.issues[0]?.message ?? 'Données invalides');
  }

  try {
    if (isCaisseEditBody(parsed.data)) {
      const result = await botEditWeekdayFlag(
        dispensaryCtx.dispensaryId,
        discordUserId,
        'chest',
        parsed.data,
      );
      return respondToBotWeekdayFlagResult(result);
    }

    const result = await botMarkChestForParisToday(dispensaryCtx.dispensaryId, discordUserId, {
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
