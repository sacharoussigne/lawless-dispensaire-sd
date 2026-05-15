import { NextResponse } from 'next/server';
import { BotDayEditError, resolveParisDayAnchor } from '@/lib/dispensaryWeeklyActivity/botDayEdit';
import { loadSerializedWeeklyActivityById } from '@/lib/dispensaryWeeklyActivity/loadSerializedRow';
import type { BotWeekdayFlagMarkResult } from '@/lib/dispensaryWeeklyActivity/service';
import { botSetWeekdayFlag } from '@/lib/dispensaryWeeklyActivity/service';

export function jsonBotError(status: number, error: string) {
  return NextResponse.json({ status, error }, { status });
}

export async function respondToBotWeekdayFlagResult(result: BotWeekdayFlagMarkResult) {
  const serialized = await loadSerializedWeeklyActivityById(result.activity.id);
  if (!serialized) {
    return jsonBotError(500, 'Erreur après mise à jour');
  }
  if (result.outcome === 'already_done') {
    return NextResponse.json({
      status: 200,
      data: { alreadyDone: true, message: result.message, activity: serialized },
    });
  }
  return NextResponse.json({
    status: 200,
    data: { alreadyDone: false, activity: serialized },
  });
}

export function mapBotRouteError(e: unknown): NextResponse | null {
  if (e instanceof BotDayEditError) {
    return jsonBotError(400, e.message);
  }
  return null;
}

export async function botEditWeekdayFlag(
  discordUserId: string,
  field: 'chest' | 'presence',
  input: BotDayEditRequestBody,
) {
  const dayAnchor = resolveParisDayAnchor({ weekday: input.weekday, date: input.date });
  return botSetWeekdayFlag(discordUserId, field, dayAnchor, input.value, {
    displayName: input.displayName,
  });
}

export type BotDayEditRequestBody = {
  weekday?: Parameters<typeof resolveParisDayAnchor>[0]['weekday'];
  date?: string;
  value: boolean;
  displayName?: string;
};

export function isCaisseEditBody(body: {
  weekday?: string;
  date?: string;
  value?: boolean;
  displayName?: string;
}): body is BotDayEditRequestBody {
  return body.weekday !== undefined || body.date !== undefined || body.value !== undefined;
}

export function isPresenceEditBody(body: {
  day?: string;
  weekday?: string;
  date?: string;
  value?: boolean;
  displayName?: string;
}): body is BotDayEditRequestBody {
  return body.weekday !== undefined || body.date !== undefined || body.value !== undefined;
}
