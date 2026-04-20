import { Prisma } from '@prisma/client';
import type {
  DispensaryWeeklyActivity,
  DispensaryWeeklyActivityHistoryAction,
  DispensaryWeeklyActivityHistorySource,
  PrismaClient,
} from '@prisma/client';
import prisma from '@/lib/prisma';
import { findLinkedUserIdByDiscordAccount } from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';
import { activityToSnapshot } from '@/lib/dispensaryWeeklyActivity/snapshot';
import type { DispensaryWeeklyActivityCreateInput, DispensaryWeeklyActivityUpdateInput } from '@/lib/dispensaryWeeklyActivity/schemas';

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

type ActorContext = {
  source: DispensaryWeeklyActivityHistorySource;
  actorUserId: string | null;
  actorDiscordUserId: string | null;
};

const COUNTER_FIELDS = [
  'chestCount',
  'sheriffPatientsCount',
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
    case 'chestCount':
      return up ? 'INCREMENT_CHEST' : 'DECREMENT_CHEST';
    case 'sheriffPatientsCount':
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

export async function createDispensaryWeeklyActivityWithHistory(
  input: DispensaryWeeklyActivityCreateInput,
  actor: ActorContext,
): Promise<DispensaryWeeklyActivity> {
  const linkedUserId =
    input.userId ?? (await findLinkedUserIdByDiscordAccount(prisma, input.discordUserId));

  return prisma.$transaction(async (tx) => {
    const created = await tx.dispensaryWeeklyActivity.create({
      data: {
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        displayName: input.displayName,
        discordUserId: input.discordUserId,
        userId: linkedUserId ?? undefined,
        chestCount: input.chestCount,
        sheriffPatientsCount: input.sheriffPatientsCount,
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
    if (input.periodStart !== undefined) data.periodStart = input.periodStart;
    if (input.periodEnd !== undefined) data.periodEnd = input.periodEnd;
    if (input.displayName !== undefined) data.displayName = input.displayName;
    if (input.chestCount !== undefined) data.chestCount = input.chestCount;
    if (input.sheriffPatientsCount !== undefined) data.sheriffPatientsCount = input.sheriffPatientsCount;
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
