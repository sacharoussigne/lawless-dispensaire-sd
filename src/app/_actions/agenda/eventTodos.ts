'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import {
  createEventTodoTaskSchema,
  updateEventTodoTaskSchema,
  deleteEventTodoTaskSchema,
} from '@/app/_actions/agenda/schemas';
import {
  getAgendaSessionContext,
  guardAgendaRead,
  guardAgendaWrite,
  resolveAgendaIdFromEventId,
  resolveAgendaIdFromEventTodoTaskId,
} from '@/app/_actions/agenda/internals';
import { emitAgendaEventTodosChange } from '@/lib/agenda/realtime/broadcast';
import type { AgendaMutationMeta } from '@/lib/agenda/realtime/mutationMeta';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

export async function listAgendaEventTodoTasks(
  dispensarySlug: string,
  eventId: string,
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const event = await prisma.agendaEvent.findFirst({
      where: {
        id: eventId,
        agenda: tenantWhere(ctx.tenant.dispensaryId),
      },
      select: {
        agendaId: true,
        participants: { where: { userId: ctx.session.user.id }, select: { id: true } },
      },
    });

    if (!event) {
      return { status: 404, error: 'Événement introuvable' };
    }

    const isParticipant = event.participants.length > 0;
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

    const tasks = await prisma.agendaEventTodoTask.findMany({
      where: { eventId },
      orderBy: { order: 'asc' },
    });

    return { status: 200, data: tasks };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement des tâches');
  }
}

export async function createAgendaEventTodoTask(
  dispensarySlug: string,
  data: { eventId: string; title: string; description?: string | null },
  meta?: AgendaMutationMeta,
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = createEventTodoTaskSchema.parse(data);
    const agendaId = await resolveAgendaIdFromEventId(
      ctx.tenant.dispensaryId,
      validated.eventId,
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

    const maxOrder = await prisma.agendaEventTodoTask.aggregate({
      where: { eventId: validated.eventId },
      _max: { order: true },
    });

    const task = await prisma.agendaEventTodoTask.create({
      data: {
        eventId: validated.eventId,
        title: validated.title,
        description: validated.description ?? null,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    await emitAgendaEventTodosChange(
      ctx.tenant.dispensaryId,
      agendaId,
      validated.eventId,
      meta,
    );

    return { status: 201, data: task };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de la tâche');
  }
}

export async function updateAgendaEventTodoTask(
  dispensarySlug: string,
  data: {
    id: string;
    title?: string;
    description?: string | null;
    completed?: boolean;
  },
  meta?: AgendaMutationMeta,
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = updateEventTodoTaskSchema.parse(data);
    const agendaId = await resolveAgendaIdFromEventTodoTaskId(
      ctx.tenant.dispensaryId,
      validated.id,
    );
    if (!agendaId) {
      return { status: 404, error: 'Tâche introuvable' };
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

    const updateData: {
      title?: string;
      description?: string | null;
      completed?: boolean;
      completedAt?: Date | null;
    } = {};

    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) {
      updateData.description = validated.description;
    }
    if (validated.completed !== undefined) {
      updateData.completed = validated.completed;
      updateData.completedAt = validated.completed ? new Date() : null;
    }

    const task = await prisma.agendaEventTodoTask.update({
      where: { id: validated.id },
      data: updateData,
    });

    await emitAgendaEventTodosChange(
      ctx.tenant.dispensaryId,
      agendaId,
      task.eventId,
      meta,
    );

    return { status: 200, data: task };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour de la tâche');
  }
}

export async function deleteAgendaEventTodoTask(
  dispensarySlug: string,
  id: string,
  meta?: AgendaMutationMeta,
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = deleteEventTodoTaskSchema.parse({ id });
    const agendaId = await resolveAgendaIdFromEventTodoTaskId(
      ctx.tenant.dispensaryId,
      validated.id,
    );
    if (!agendaId) {
      return { status: 404, error: 'Tâche introuvable' };
    }

    const existingTask = await prisma.agendaEventTodoTask.findUnique({
      where: { id: validated.id },
      select: { eventId: true },
    });
    if (!existingTask) {
      return { status: 404, error: 'Tâche introuvable' };
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

    await prisma.agendaEventTodoTask.delete({ where: { id: validated.id } });

    await emitAgendaEventTodosChange(
      ctx.tenant.dispensaryId,
      agendaId,
      existingTask.eventId,
      meta,
    );

    return { status: 200 };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la tâche');
  }
}
