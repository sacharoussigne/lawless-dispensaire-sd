import { Prisma } from '@prisma/client';
import type {
  DispensaryWeeklyActivity,
  DispensaryWeeklyActivityHistoryAction,
  DispensaryWeeklyActivityHistorySource,
  PrismaClient,
} from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  findLinkedUserIdByDiscordAccount,
  resolveBotWeeklyActivityDisplayName,
} from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';
import { activityToSnapshot } from '@/lib/dispensaryWeeklyActivity/snapshot';
import { getBankWeekBounds } from '@/lib/bankWeek';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import type { DispensaryWeeklyActivityCreateInput, DispensaryWeeklyActivityUpdateInput } from '@/lib/dispensaryWeeklyActivity/schemas';
import {
  assertActivityInCurrentParisWeek,
  assertBotEditableParisDay,
  buildBotDayFieldHistoryPayload,
  weekdayKeyForParisAnchor,
} from '@/lib/dispensaryWeeklyActivity/botDayEdit';
import {
  emptyWeekdayFlags,
  parisCalendarDayRangeUtc,
  parisTodayStartUtc,
  parisYesterdayStartUtc,
  parseWeekdayFlagsJson,
} from '@/lib/dispensaryWeeklyActivity/weekdayFlags';
import { DISCORD_ACCOUNT_PROVIDER_ID } from '@/lib/dispensaryWeeklyActivity/constants';

export function getNormalizedWeeklyActivityPeriod(anchor: Date): {
  periodStart: Date;
  periodEnd: Date;
} {
  const { start, end } = getBankWeekBounds(anchor);
  return { periodStart: start, periodEnd: end };
}

function normalizeParisWeekBounds(anchor: Date): { periodStart: Date; periodEnd: Date } {
  return getNormalizedWeeklyActivityPeriod(anchor);
}

export async function findWeeklyActivityByDoctorAndPeriod(
  client: WeeklyActivityDb,
  dispensaryId: string,
  discordUserId: string,
  anchor: Date,
): Promise<DispensaryWeeklyActivity | null> {
  if (!dispensaryId.trim()) {
    throw new Error('Dispensaire requis pour la recherche d’activité');
  }
  const { periodStart, periodEnd } = getNormalizedWeeklyActivityPeriod(anchor);
  return client.dispensaryWeeklyActivity.findFirst({
    where: {
      ...tenantWhere(dispensaryId),
      discordUserId,
      periodStart,
      periodEnd,
    },
  });
}

export const WEEKLY_ACTIVITY_DUPLICATE_MESSAGE =
  'Une activité existe déjà pour ce médecin sur cette semaine dans ce dispensaire. Modifiez l’entrée existante dans le tableau.';

type WeeklyActivityDb = Pick<PrismaClient, 'dispensaryWeeklyActivity' | 'account'>;

export async function syncActivityUserIdFromDiscordIfMissing(
  client: WeeklyActivityDb,
  activity: DispensaryWeeklyActivity,
): Promise<DispensaryWeeklyActivity> {
  if (activity.userId) return activity;
  const uid = await findLinkedUserIdByDiscordAccount(client, activity.discordUserId);
  if (!uid) return activity;
  return client.dispensaryWeeklyActivity.update({
    where: { id: activity.id },
    data: { userId: uid },
  });
}

export async function batchSyncActivityUserIds<T extends DispensaryWeeklyActivity>(
  client: WeeklyActivityDb,
  rows: T[],
): Promise<T[]> {
  const missing = rows.filter((r) => !r.userId);
  if (missing.length === 0) return rows;

  const discordUserIds = [...new Set(missing.map((r) => r.discordUserId))];
  const accounts = await client.account.findMany({
    where: {
      providerId: DISCORD_ACCOUNT_PROVIDER_ID,
      accountId: { in: discordUserIds },
    },
    select: { accountId: true, userId: true },
  });

  const discordToUserId = new Map(accounts.map((a) => [a.accountId, a.userId]));
  const updates: { id: string; userId: string }[] = [];
  for (const row of missing) {
    const userId = discordToUserId.get(row.discordUserId);
    if (userId) {
      updates.push({ id: row.id, userId });
    }
  }

  if (updates.length > 0) {
    await Promise.all(
      updates.map(({ id, userId }) =>
        client.dispensaryWeeklyActivity.update({ where: { id }, data: { userId } }),
      ),
    );
  }

  const userIdByRowId = new Map(updates.map((u) => [u.id, u.userId]));
  return rows.map((row) => {
    const userId = userIdByRowId.get(row.id);
    return userId ? { ...row, userId } : row;
  });
}

export async function findDispensaryActivityOverlappingParisDay(
  client: WeeklyActivityDb,
  dispensaryId: string,
  discordUserId: string,
  dayAnchor: Date,
): Promise<DispensaryWeeklyActivity | null> {
  const { start, end } = parisCalendarDayRangeUtc(dayAnchor);
  return client.dispensaryWeeklyActivity.findFirst({
    where: {
      dispensaryId,
      discordUserId,
      periodStart: { lte: end },
      periodEnd: { gte: start },
    },
  });
}

type ActorContext = {
  source: DispensaryWeeklyActivityHistorySource;
  actorUserId: string | null;
  actorDiscordUserId: string | null;
  dispensaryId?: string;
};

const COUNTER_FIELDS = [
  'sherifCount',
  'patientsCount',
  'infusionsCount',
  'poppyMilkCount',
] as const;

type CounterField = (typeof COUNTER_FIELDS)[number];

function counterDeltaToHistoryAction(
  field: CounterField,
  before: number,
  after: number,
): DispensaryWeeklyActivityHistoryAction | null {
  if (before === after) return null;
  const up = after > before;
  switch (field) {
    case 'sherifCount':
      return up ? 'INCREMENT_SHERIFF' : 'DECREMENT_SHERIFF';
    case 'patientsCount':
      return up ? 'INCREMENT_PATIENTS' : 'DECREMENT_PATIENTS';
    case 'infusionsCount':
      return up ? 'INCREMENT_INFUSIONS' : 'DECREMENT_INFUSIONS';
    case 'poppyMilkCount':
      return up ? 'INCREMENT_POPPY_MILK' : 'DECREMENT_POPPY_MILK';
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}

function botMetaChanged(
  before: DispensaryWeeklyActivity,
  after: DispensaryWeeklyActivity,
): boolean {
  return (
    before.periodStart.getTime() !== after.periodStart.getTime() ||
    before.periodEnd.getTime() !== after.periodEnd.getTime() ||
    before.displayName !== after.displayName
  );
}

function snapshotsEqual(a: ReturnType<typeof activityToSnapshot>, b: ReturnType<typeof activityToSnapshot>) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function createDispensaryWeeklyActivityWithHistory(
  input: DispensaryWeeklyActivityCreateInput,
  actor: ActorContext,
): Promise<DispensaryWeeklyActivity> {
  const dispensaryId = actor.dispensaryId;
  if (!dispensaryId) {
    throw new Error('Dispensaire requis');
  }

  const linkedUserId =
    input.userId ?? (await findLinkedUserIdByDiscordAccount(prisma, input.discordUserId));

  const { periodStart, periodEnd } = normalizeParisWeekBounds(input.periodStart);

  const duplicate = await findWeeklyActivityByDoctorAndPeriod(
    prisma,
    dispensaryId,
    input.discordUserId,
    input.periodStart,
  );
  if (duplicate) {
    throw new Error(WEEKLY_ACTIVITY_DUPLICATE_MESSAGE);
  }

  const chestDays = input.chestDays ?? emptyWeekdayFlags();
  const presenceDays = input.presenceDays ?? emptyWeekdayFlags();

  return prisma.$transaction(async (tx) => {
    const created = await tx.dispensaryWeeklyActivity.create({
      data: {
        dispensaryId,
        periodStart,
        periodEnd,
        displayName: input.displayName,
        discordUserId: input.discordUserId,
        userId: linkedUserId ?? undefined,
        chestDays: chestDays as Prisma.InputJsonValue,
        presenceDays: presenceDays as Prisma.InputJsonValue,
        sherifCount: input.sherifCount,
        patientsCount: input.patientsCount,
        infusionsCount: input.infusionsCount,
        poppyMilkCount: input.poppyMilkCount,
      },
    });

    const synced = await syncActivityUserIdFromDiscordIfMissing(tx, created);

    await tx.dispensaryWeeklyActivityHistory.create({
      data: {
        activityId: synced.id,
        action: 'CREATE',
        source: actor.source,
        actorUserId: actor.actorUserId,
        actorDiscordUserId: actor.actorDiscordUserId,
        previousValues: Prisma.JsonNull,
        nextValues: activityToSnapshot(synced) as Prisma.InputJsonValue,
      },
    });

    return synced;
  });
}

export async function updateDispensaryWeeklyActivityWithHistory(
  id: string,
  input: DispensaryWeeklyActivityUpdateInput,
  actor: ActorContext,
): Promise<DispensaryWeeklyActivity> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.dispensaryWeeklyActivity.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Activité introuvable');
    }

    const data: Prisma.DispensaryWeeklyActivityUpdateInput = {};
    if (input.periodStart !== undefined || input.periodEnd !== undefined) {
      const anchor = input.periodStart ?? input.periodEnd;
      if (!anchor) {
        throw new Error('periodStart or periodEnd is required');
      }
      const normalized = normalizeParisWeekBounds(anchor);
      data.periodStart = normalized.periodStart;
      data.periodEnd = normalized.periodEnd;
    }
    if (input.displayName !== undefined) data.displayName = input.displayName;
    if (input.chestDays !== undefined) data.chestDays = input.chestDays as Prisma.InputJsonValue;
    if (input.presenceDays !== undefined) data.presenceDays = input.presenceDays as Prisma.InputJsonValue;
    if (input.sherifCount !== undefined) data.sherifCount = input.sherifCount;
    if (input.patientsCount !== undefined) data.patientsCount = input.patientsCount;
    if (input.infusionsCount !== undefined) data.infusionsCount = input.infusionsCount;
    if (input.poppyMilkCount !== undefined) data.poppyMilkCount = input.poppyMilkCount;

    const updated = await tx.dispensaryWeeklyActivity.update({
      where: { id },
      data,
    });

    let finalRow = updated;
    const relinked = await syncActivityUserIdFromDiscordIfMissing(tx, updated);
    if (relinked.userId !== updated.userId) {
      finalRow = relinked;
    }

    const prevSnap = activityToSnapshot(existing);
    const nextSnap = activityToSnapshot(finalRow);

    if (actor.source === 'INTRANET') {
      if (!snapshotsEqual(prevSnap, nextSnap)) {
        await tx.dispensaryWeeklyActivityHistory.create({
          data: {
            activityId: id,
            action: 'UPDATE',
            source: actor.source,
            actorUserId: actor.actorUserId,
            actorDiscordUserId: actor.actorDiscordUserId,
            previousValues: prevSnap as Prisma.InputJsonValue,
            nextValues: nextSnap as Prisma.InputJsonValue,
          },
        });
      }
    } else {
      for (const field of COUNTER_FIELDS) {
        const actionKind = counterDeltaToHistoryAction(
          field,
          existing[field],
          finalRow[field],
        );
        if (!actionKind) continue;
        await tx.dispensaryWeeklyActivityHistory.create({
          data: {
            activityId: id,
            action: actionKind,
            source: actor.source,
            actorUserId: actor.actorUserId,
            actorDiscordUserId: actor.actorDiscordUserId,
            previousValues: prevSnap as Prisma.InputJsonValue,
            nextValues: nextSnap as Prisma.InputJsonValue,
          },
        });
      }
      if (botMetaChanged(existing, finalRow)) {
        await tx.dispensaryWeeklyActivityHistory.create({
          data: {
            activityId: id,
            action: 'UPDATE',
            source: actor.source,
            actorUserId: actor.actorUserId,
            actorDiscordUserId: actor.actorDiscordUserId,
            previousValues: prevSnap as Prisma.InputJsonValue,
            nextValues: nextSnap as Prisma.InputJsonValue,
          },
        });
      }
    }

    return finalRow;
  });
}

export async function deleteDispensaryWeeklyActivityWithHistory(
  id: string,
  actor: ActorContext,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.dispensaryWeeklyActivity.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Activité introuvable');
    }

    await tx.dispensaryWeeklyActivityHistory.create({
      data: {
        activityId: id,
        action: 'DELETE',
        source: actor.source,
        actorUserId: actor.actorUserId,
        actorDiscordUserId: actor.actorDiscordUserId,
        previousValues: activityToSnapshot(existing) as Prisma.InputJsonValue,
        nextValues: Prisma.JsonNull,
      },
    });

    await tx.dispensaryWeeklyActivity.delete({ where: { id } });
  });
}

export async function findOrCreateDispensaryActivityForParisDay(
  client: WeeklyActivityDb,
  dispensaryId: string,
  discordUserId: string,
  dayAnchor: Date,
  preferredDisplayName?: string,
): Promise<DispensaryWeeklyActivity> {
  const preferred =
    preferredDisplayName !== undefined && preferredDisplayName.trim().length > 0
      ? preferredDisplayName.trim().slice(0, 200)
      : undefined;

  const actor: ActorContext = {
    source: 'DISCORD_BOT',
    actorUserId: null,
    actorDiscordUserId: discordUserId,
    dispensaryId,
  };

  const found = await findDispensaryActivityOverlappingParisDay(
    client,
    dispensaryId,
    discordUserId,
    dayAnchor,
  );
  if (found) {
    if (preferred && preferred !== found.displayName) {
      return updateDispensaryWeeklyActivityWithHistory(found.id, { displayName: preferred }, actor);
    }
    return found;
  }

  const { start, end } = getBankWeekBounds(dayAnchor);
  const displayName = preferred ?? (await resolveBotWeeklyActivityDisplayName(client, discordUserId));
  const linkedUserId = await findLinkedUserIdByDiscordAccount(client, discordUserId);

  try {
    return await createDispensaryWeeklyActivityWithHistory(
      {
        periodStart: start,
        periodEnd: end,
        displayName,
        discordUserId,
        userId: linkedUserId,
        sherifCount: 0,
        patientsCount: 0,
        infusionsCount: 0,
        poppyMilkCount: 0,
      },
      actor,
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const raced = await findDispensaryActivityOverlappingParisDay(
        client,
        dispensaryId,
        discordUserId,
        dayAnchor,
      );
      if (raced) {
        if (preferred && preferred !== raced.displayName) {
          return updateDispensaryWeeklyActivityWithHistory(
            raced.id,
            { displayName: preferred },
            actor,
          );
        }
        return raced;
      }
    }
    throw e;
  }
}

export type BotWeekdayFlagMarkResult =
  | { outcome: 'already_done'; message: string; activity: DispensaryWeeklyActivity }
  | { outcome: 'ok'; activity: DispensaryWeeklyActivity };

export type BotWeeklyActivityRequestOptions = {
  /** RP / Discord display name; updates stored `displayName` when different (trim, 1–200 chars). */
  displayName?: string;
  /** When false, allows editing days outside the current Paris week (legacy presence yesterday). */
  requireCurrentParisWeek?: boolean;
};

function alreadyDoneMessage(field: 'chest' | 'presence', value: boolean): string {
  if (field === 'chest') {
    return value
      ? 'La caisse de ce jour est déjà enregistrée.'
      : 'La caisse de ce jour est déjà désactivée.';
  }
  return value
    ? 'La présence de ce jour est déjà enregistrée.'
    : 'La présence de ce jour est déjà désactivée.';
}

export async function botSetWeekdayFlag(
  dispensaryId: string,
  discordUserId: string,
  field: 'chest' | 'presence',
  dayAnchor: Date,
  value: boolean,
  options?: BotWeeklyActivityRequestOptions,
): Promise<BotWeekdayFlagMarkResult> {
  const requireCurrentWeek = options?.requireCurrentParisWeek !== false;
  assertBotEditableParisDay(dayAnchor, { requireCurrentParisWeek: requireCurrentWeek });

  const createAnchor = requireCurrentWeek
    ? getBankWeekBounds(new Date()).start
    : dayAnchor;

  const existing = await findOrCreateDispensaryActivityForParisDay(
    prisma,
    dispensaryId,
    discordUserId,
    createAnchor,
    options?.displayName,
  );

  if (requireCurrentWeek) {
    assertActivityInCurrentParisWeek(existing.periodStart, existing.periodEnd);
  }

  const key = weekdayKeyForParisAnchor(dayAnchor);
  const flagsField = field === 'chest' ? 'chestDays' : 'presenceDays';
  const currentFlags = parseWeekdayFlagsJson(existing[flagsField]);

  if (currentFlags[key] === value) {
    return {
      outcome: 'already_done',
      message: alreadyDoneMessage(field, value),
      activity: existing,
    };
  }

  const historyAction =
    field === 'chest' ? ('UPDATE_CHEST_DAYS' as const) : ('UPDATE_PRESENCE_DAYS' as const);

  return prisma.$transaction(async (tx) => {
    const row = await tx.dispensaryWeeklyActivity.findUnique({ where: { id: existing.id } });
    if (!row) {
      throw new Error('Activité introuvable');
    }

    if (requireCurrentWeek) {
      assertActivityInCurrentParisWeek(row.periodStart, row.periodEnd);
    }

    const current = parseWeekdayFlagsJson(row[flagsField]);
    if (current[key] === value) {
      return {
        outcome: 'already_done' as const,
        message: alreadyDoneMessage(field, value),
        activity: row,
      };
    }

    const nextFlags = { ...current, [key]: value };
    const updated = await tx.dispensaryWeeklyActivity.update({
      where: { id: row.id },
      data: { [flagsField]: nextFlags as Prisma.InputJsonValue },
    });
    const synced = await syncActivityUserIdFromDiscordIfMissing(tx, updated);

    const previousValues = buildBotDayFieldHistoryPayload(dayAnchor, field, current[key]);
    const nextValues = buildBotDayFieldHistoryPayload(dayAnchor, field, value);

    await tx.dispensaryWeeklyActivityHistory.create({
      data: {
        activityId: synced.id,
        action: historyAction,
        source: 'DISCORD_BOT',
        actorUserId: null,
        actorDiscordUserId: discordUserId,
        previousValues: previousValues as Prisma.InputJsonValue,
        nextValues: nextValues as Prisma.InputJsonValue,
      },
    });

    return { outcome: 'ok' as const, activity: synced };
  });
}

export async function botMarkChestForParisToday(
  dispensaryId: string,
  discordUserId: string,
  options?: BotWeeklyActivityRequestOptions,
): Promise<BotWeekdayFlagMarkResult> {
  return botSetWeekdayFlag(dispensaryId, discordUserId, 'chest', new Date(), true, options);
}

export async function botMarkPresenceForParisRelativeDay(
  dispensaryId: string,
  discordUserId: string,
  relative: 'today' | 'yesterday',
  options?: BotWeeklyActivityRequestOptions,
): Promise<BotWeekdayFlagMarkResult> {
  const dayAnchor = relative === 'today' ? parisTodayStartUtc() : parisYesterdayStartUtc();
  return botSetWeekdayFlag(dispensaryId, discordUserId, 'presence', dayAnchor, true, {
    ...options,
    requireCurrentParisWeek: relative === 'today',
  });
}
