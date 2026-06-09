'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import {
  createEventTodoTaskSchema,
  updateEventTodoTaskSchema,
  deleteEventTodoTaskSchema,
  reorderSchema,
} from '@/app/_actions/agenda/schemas';
import {
  getAgendaSessionContext,
  guardAgendaWrite,
  resolveAgendaIdFromEventId,
  resolveAgendaIdFromEventTodoTaskId,
} from '@/app/_actions/agenda/internals';

export async function createAgendaEventTodoTask(
  dispensarySlug: string,
  data: { eventId: string; title: string; description?: string | null },
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

    return { status: 200, data: task };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour de la tâche');
  }
}

export async function deleteAgendaEventTodoTask(dispensarySlug: string, id: string) {
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

    return { status: 200 };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la tâche');
  }
}

export async function reorderAgendaEventTodoTasks(
  dispensarySlug: string,
  data: { items: { id: string; order: number }[] },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = reorderSchema.parse(data);
    if (validated.items.length === 0) {
      return { status: 200, data: { success: true } };
    }

    const agendaId = await resolveAgendaIdFromEventTodoTaskId(
      ctx.tenant.dispensaryId,
      validated.items[0].id,
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

    await Promise.all(
      validated.items.map(({ id, order }) =>
        prisma.agendaEventTodoTask.update({
          where: { id },
          data: { order },
        }),
      ),
    );

    return { status: 200, data: { success: true } };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du réordonnancement');
  }
}
