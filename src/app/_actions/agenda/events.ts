'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import { listAccessibleAgendaIds } from '@/lib/agenda/access';
import {
  assertAgendaEventRangeValid,
  parseAgendaDateInput,
  parseAgendaEndDateInput,
} from '@/lib/agenda/dates';
import type { AgendaEventDTO } from '@/types/agenda';
import {
  createAgendaEventSchema,
  updateAgendaEventSchema,
  deleteAgendaEventSchema,
  listAgendaEventsSchema,
} from '@/app/_actions/agenda/schemas';
import {
  getAgendaSessionContext,
  guardAgendaRead,
  guardAgendaWrite,
  resolveAgendaIdFromEventId,
  validateDispensaryUserIds,
} from '@/app/_actions/agenda/internals';
import { emitAgendaEventsChange } from '@/lib/agenda/realtime/broadcast';
import type { AgendaMutationMeta } from '@/lib/agenda/realtime/mutationMeta';

const eventListInclude = {
  agenda: { select: { name: true } },
  participants: { select: { userId: true } },
};

const eventDetailInclude = {
  participants: {
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  },
  todoTasks: { orderBy: { order: 'asc' as const } },
  agenda: { select: { name: true } },
};

type EventBaseRow = {
  id: string;
  agendaId: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  createdById: string | null;
  agenda: { name: string };
};

type EventListRow = EventBaseRow & {
  participants: { userId: string }[];
};

type EventDetailRow = EventBaseRow & {
  participants: {
    id: string;
    userId: string;
    user: { id: string; name: string; email: string; image: string | null };
  }[];
  todoTasks: {
    id: string;
    eventId: string;
    title: string;
    description: string | null;
    completed: boolean;
    completedAt: Date | null;
    order: number;
  }[];
};

function mapListEvent(event: EventListRow, currentUserId: string): AgendaEventDTO {
  return {
    id: event.id,
    agendaId: event.agendaId,
    title: event.title,
    description: event.description,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: event.allDay,
    createdById: event.createdById,
    participants: [],
    todoTasks: [],
    isParticipant: event.participants.some((p) => p.userId === currentUserId),
    agendaName: event.agenda.name,
  };
}

function mapDetailEvent(event: EventDetailRow, currentUserId: string): AgendaEventDTO {
  return {
    id: event.id,
    agendaId: event.agendaId,
    title: event.title,
    description: event.description,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: event.allDay,
    createdById: event.createdById,
    participants: event.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      user: p.user,
    })),
    todoTasks: event.todoTasks,
    isParticipant: event.participants.some((p) => p.userId === currentUserId),
    agendaName: event.agenda.name,
  };
}

export async function listAgendaEvents(
  dispensarySlug: string,
  data: { agendaId?: string; rangeStart: string; rangeEnd: string },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = listAgendaEventsSchema.parse(data);
    const rangeStart = new Date(validated.rangeStart);
    const rangeEnd = new Date(validated.rangeEnd);

    const accessibleAgendaIds = await listAccessibleAgendaIds(
      ctx.tenant.dispensaryId,
      ctx.session.user.id,
      ctx.session.user.role,
      ctx.tenant.effectiveRole,
    );

    const selectedAgendaId = validated.agendaId;
    if (selectedAgendaId) {
      const guard = await guardAgendaRead(
        ctx.tenant.dispensaryId,
        selectedAgendaId,
        ctx.session,
        ctx.tenant.effectiveRole,
      );
      if (!guard.ok) {
        return { status: guard.status, error: guard.error };
      }
    }

    const agendaFilter = selectedAgendaId
      ? [selectedAgendaId]
      : accessibleAgendaIds;

    const [agendaEvents, participantEvents] = await Promise.all([
      agendaFilter.length > 0
        ? prisma.agendaEvent.findMany({
            where: {
              agendaId: { in: agendaFilter },
              agenda: tenantWhere(ctx.tenant.dispensaryId),
              startAt: { lte: rangeEnd },
              endAt: { gte: rangeStart },
            },
            include: eventListInclude,
          })
        : Promise.resolve([]),
      prisma.agendaEvent.findMany({
        where: {
          agenda: tenantWhere(ctx.tenant.dispensaryId),
          startAt: { lte: rangeEnd },
          endAt: { gte: rangeStart },
          participants: { some: { userId: ctx.session.user.id } },
        },
        include: eventListInclude,
      }),
    ]);

    const byId = new Map<string, AgendaEventDTO>();
    for (const event of [...agendaEvents, ...participantEvents]) {
      byId.set(event.id, mapListEvent(event, ctx.session.user.id));
    }

    return { status: 200, data: Array.from(byId.values()) };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement des événements');
  }
}

export async function getAgendaEvent(dispensarySlug: string, eventId: string) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const event = await prisma.agendaEvent.findFirst({
      where: {
        id: eventId,
        agenda: tenantWhere(ctx.tenant.dispensaryId),
      },
      include: eventDetailInclude,
    });

    if (!event) {
      return { status: 404, error: 'Événement introuvable' };
    }

    const isParticipant = event.participants.some(
      (p) => p.userId === ctx.session.user.id,
    );

    if (!isParticipant) {
      const guard = await guardAgendaRead(
        ctx.tenant.dispensaryId,
        event.agendaId,
        ctx.session,
        ctx.tenant.effectiveRole,
      );
      if (!guard.ok) {
        return { status: guard.status, error: guard.error };
      }
    }

    return { status: 200, data: mapDetailEvent(event, ctx.session.user.id) };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement de l\'événement');
  }
}

export async function createAgendaEvent(
  dispensarySlug: string,
  data: {
    agendaId: string;
    title: string;
    description?: string | null;
    startDate: string;
    startTime?: string;
    endDate: string;
    endTime?: string;
    allDay: boolean;
    participantUserIds: string[];
  },
  meta?: AgendaMutationMeta,
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = createAgendaEventSchema.parse(data);

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      validated.agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    const validUsers = await validateDispensaryUserIds(
      ctx.tenant.dispensaryId,
      validated.participantUserIds,
    );
    if (!validUsers) {
      return { status: 400, error: 'Un ou plusieurs participants invalides' };
    }

    const startAt = parseAgendaDateInput(
      validated.startDate,
      validated.startTime,
      validated.allDay,
    );
    const endAt = parseAgendaEndDateInput(
      validated.endDate,
      validated.endTime,
      validated.allDay,
    );

    try {
      assertAgendaEventRangeValid(startAt, endAt, validated.allDay);
    } catch (error: unknown) {
      return {
        status: 400,
        error: error instanceof Error ? error.message : 'Plage horaire invalide',
      };
    }

    const event = await prisma.agendaEvent.create({
      data: {
        agendaId: validated.agendaId,
        title: validated.title,
        description: validated.description ?? null,
        startAt,
        endAt,
        allDay: validated.allDay,
        createdById: ctx.session.user.id,
        participants: {
          create: validated.participantUserIds.map((userId) => ({ userId })),
        },
      },
      include: eventDetailInclude,
    });

    await emitAgendaEventsChange(ctx.tenant.dispensaryId, validated.agendaId, meta);

    return { status: 201, data: mapDetailEvent(event, ctx.session.user.id) };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de l\'événement');
  }
}

export async function updateAgendaEvent(
  dispensarySlug: string,
  data: {
    id: string;
    agendaId: string;
    title: string;
    description?: string | null;
    startDate: string;
    startTime?: string;
    endDate: string;
    endTime?: string;
    allDay: boolean;
    participantUserIds: string[];
  },
  meta?: AgendaMutationMeta,
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = updateAgendaEventSchema.parse(data);

    const existing = await prisma.agendaEvent.findFirst({
      where: {
        id: validated.id,
        agenda: tenantWhere(ctx.tenant.dispensaryId),
      },
      select: {
        agendaId: true,
        participants: { select: { userId: true } },
      },
    });

    if (!existing) {
      return { status: 404, error: 'Événement introuvable' };
    }

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      existing.agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    const validUsers = await validateDispensaryUserIds(
      ctx.tenant.dispensaryId,
      validated.participantUserIds,
    );
    if (!validUsers) {
      return { status: 400, error: 'Un ou plusieurs participants invalides' };
    }

    const startAt = parseAgendaDateInput(
      validated.startDate,
      validated.startTime,
      validated.allDay,
    );
    const endAt = parseAgendaEndDateInput(
      validated.endDate,
      validated.endTime,
      validated.allDay,
    );

    try {
      assertAgendaEventRangeValid(startAt, endAt, validated.allDay);
    } catch (error: unknown) {
      return {
        status: 400,
        error: error instanceof Error ? error.message : 'Plage horaire invalide',
      };
    }

    const existingParticipantIds = new Set(
      existing.participants.map((participant) => participant.userId),
    );
    const nextParticipantIds = new Set(validated.participantUserIds);
    const participantIdsToRemove = [...existingParticipantIds].filter(
      (userId) => !nextParticipantIds.has(userId),
    );
    const participantIdsToAdd = validated.participantUserIds.filter(
      (userId) => !existingParticipantIds.has(userId),
    );

    const event = await prisma.$transaction(async (tx) => {
      await tx.agendaEvent.update({
        where: { id: validated.id },
        data: {
          title: validated.title,
          description: validated.description ?? null,
          startAt,
          endAt,
          allDay: validated.allDay,
        },
      });

      if (participantIdsToRemove.length > 0) {
        await tx.agendaEventParticipant.deleteMany({
          where: {
            eventId: validated.id,
            userId: { in: participantIdsToRemove },
          },
        });
      }

      if (participantIdsToAdd.length > 0) {
        await tx.agendaEventParticipant.createMany({
          data: participantIdsToAdd.map((userId) => ({
            eventId: validated.id,
            userId,
          })),
        });
      }

      return tx.agendaEvent.findFirstOrThrow({
        where: { id: validated.id },
        include: eventDetailInclude,
      });
    });

    await emitAgendaEventsChange(ctx.tenant.dispensaryId, existing.agendaId, meta);

    return { status: 200, data: mapDetailEvent(event, ctx.session.user.id) };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour de l\'événement');
  }
}

export async function deleteAgendaEvent(
  dispensarySlug: string,
  id: string,
  meta?: AgendaMutationMeta,
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = deleteAgendaEventSchema.parse({ id });

    const agendaId = await resolveAgendaIdFromEventId(
      ctx.tenant.dispensaryId,
      validated.id,
    );
    if (!agendaId) {
      return { status: 404, error: 'Événement introuvable' };
    }

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    await prisma.agendaEvent.delete({ where: { id: validated.id } });

    await emitAgendaEventsChange(ctx.tenant.dispensaryId, agendaId, meta);

    return { status: 200 };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de l\'événement');
  }
}
