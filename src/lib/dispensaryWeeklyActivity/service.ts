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
import type { DispensaryWeeklyActivityCreateInput, DispensaryWeeklyActivityUpdateInput } from '@/lib/dispensaryWeeklyActivity/schemas';
import {
  emptyWeekdayFlags,
  parisCalendarDayRangeUtc,
  parisTodayStartUtc,
  parisWeekdayKey,
  parisYesterdayStartUtc,
  parseWeekdayFlagsJson,
} from '@/lib/dispensaryWeeklyActivity/weekdayFlags';

function normalizeParisWeekBounds(anchor: Date): { periodStart: Date; periodEnd: Date } {
  const { start, end } = getBankWeekBounds(anchor);
  return { periodStart: start, periodEnd: end };
}

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

export async function findDispensaryActivityOverlappingParisDay(
  client: WeeklyActivityDb,
  discordUserId: string,
  dayAnchor: Date,
): Promise<DispensaryWeeklyActivity | null> {
  const { start, end } = parisCalendarDayRangeUtc(dayAnchor);
  return client.dispensaryWeeklyActivity.findFirst({
    where: {
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
  const linkedUserId =
    input.userId ?? (await findLinkedUserIdByDiscordAccount(prisma, input.discordUserId));

  const { periodStart, periodEnd } = normalizeParisWeekBounds(input.periodStart);

  const chestDays = input.chestDays ?? emptyWeekdayFlags();
  const presenceDays = input.presenceDays ?? emptyWeekdayFlags();

  return prisma.$transaction(async (tx) => {
    const created = await tx.dispensaryWeeklyActivity.create({
      data: {
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
      const anchor = (input.periodStart ?? input.periodEnd)!;
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
  discordUserId: string,
  dayAnchor: Date,
): Promise<DispensaryWeeklyActivity> {
  const found = await findDispensaryActivityOverlappingParisDay(client, discordUserId, dayAnchor);
  if (found) return found;

  const { start, end } = getBankWeekBounds(dayAnchor);
  const displayName = await resolveBotWeeklyActivityDisplayName(client, discordUserId);
  const linkedUserId = await findLinkedUserIdByDiscordAccount(client, discordUserId);

  const actor: ActorContext = {
    source: 'DISCORD_BOT',
    actorUserId: null,
    actorDiscordUserId: discordUserId,
  };

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
      const raced = await findDispensaryActivityOverlappingParisDay(client, discordUserId, dayAnchor);
      if (raced) return raced;
    }
    throw e;
  }
}

export type BotChestMarkResult =
  | { outcome: 'already_done'; message: string }
  | { outcome: 'ok'; activity: DispensaryWeeklyActivity };

export async function botMarkChestForParisToday(discordUserId: string): Promise<BotChestMarkResult> {
  const anchor = new Date();
  const existing = await findOrCreateDispensaryActivityForParisDay(prisma, discordUserId, anchor);

  const key = parisWeekdayKey(anchor);
  if (parseWeekdayFlagsJson(existing.chestDays)[key]) {
    return {
      outcome: 'already_done',
      message: 'La caisse de ce jour a déjà été enregistrée.',
    };
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.dispensaryWeeklyActivity.findUnique({ where: { id: existing.id } });
    if (!row) {
      throw new Error('Activité introuvable');
    }
    const current = parseWeekdayFlagsJson(row.chestDays);
    if (current[key]) {
      return {
        outcome: 'already_done' as const,
        message: 'La caisse de ce jour a déjà été enregistrée.',
      };
    }
    const nextChest = { ...current, [key]: true };
    const updated = await tx.dispensaryWeeklyActivity.update({
      where: { id: row.id },
      data: { chestDays: nextChest as Prisma.InputJsonValue },
    });
    const synced = await syncActivityUserIdFromDiscordIfMissing(tx, updated);
    const prevSnap = activityToSnapshot(row);
    const nextSnap = activityToSnapshot(synced);
    await tx.dispensaryWeeklyActivityHistory.create({
      data: {
        activityId: synced.id,
        action: 'UPDATE_CHEST_DAYS',
        source: 'DISCORD_BOT',
        actorUserId: null,
        actorDiscordUserId: discordUserId,
        previousValues: prevSnap as Prisma.InputJsonValue,
        nextValues: nextSnap as Prisma.InputJsonValue,
      },
    });
    return { outcome: 'ok' as const, activity: synced };
  });
}

export type BotPresenceMarkResult =
  | { outcome: 'already_done'; message: string }
  | { outcome: 'ok'; activity: DispensaryWeeklyActivity };

export async function botMarkPresenceForParisRelativeDay(
  discordUserId: string,
  relative: 'today' | 'yesterday',
): Promise<BotPresenceMarkResult> {
  const dayAnchor = relative === 'today' ? parisTodayStartUtc() : parisYesterdayStartUtc();
  const existing = await findOrCreateDispensaryActivityForParisDay(prisma, discordUserId, dayAnchor);

  const key = parisWeekdayKey(dayAnchor);
  if (parseWeekdayFlagsJson(existing.presenceDays)[key]) {
    return {
      outcome: 'already_done',
      message: 'La présence de ce jour a déjà été enregistrée.',
    };
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.dispensaryWeeklyActivity.findUnique({ where: { id: existing.id } });
    if (!row) {
      throw new Error('Activité introuvable');
    }
    const current = parseWeekdayFlagsJson(row.presenceDays);
    if (current[key]) {
      return {
        outcome: 'already_done' as const,
        message: 'La présence de ce jour a déjà été enregistrée.',
      };
    }
    const nextPresence = { ...current, [key]: true };
    const updated = await tx.dispensaryWeeklyActivity.update({
      where: { id: row.id },
      data: { presenceDays: nextPresence as Prisma.InputJsonValue },
    });
    const synced = await syncActivityUserIdFromDiscordIfMissing(tx, updated);
    const prevSnap = activityToSnapshot(row);
    const nextSnap = activityToSnapshot(synced);
    await tx.dispensaryWeeklyActivityHistory.create({
      data: {
        activityId: synced.id,
        action: 'UPDATE_PRESENCE_DAYS',
        source: 'DISCORD_BOT',
        actorUserId: null,
        actorDiscordUserId: discordUserId,
        previousValues: prevSnap as Prisma.InputJsonValue,
        nextValues: nextSnap as Prisma.InputJsonValue,
      },
    });
    return { outcome: 'ok' as const, activity: synced };
  });
}
